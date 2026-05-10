type Env = {
  DB: D1Database;
  FOOD_IMAGES?: R2Bucket;
  APP_NAME: string;
  ADMIN_EMAIL: string;
  IMAGE_PROVIDER: string;
  IMAGE_API_KEY?: string;
  DASHSCOPE_API_KEY?: string;
  DASHSCOPE_WORKSPACE?: string;
};

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });

const ok = (data: unknown) => json({ data });
const fail = (message: string, status = 400) => json({ error: message }, { status });

export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/?/, "");
    const parts = path.split("/").filter(Boolean);

    if (request.method === "GET" && parts[0] === "images" && parts[1]) return getImage(env, parts.slice(1).join("/"));

    if (request.method === "GET" && path === "recipes") return listRecipes(request, env);
    if (request.method === "GET" && parts[0] === "recipes" && parts[1]) return getRecipe(request, env, parts[1]);
    if (request.method === "POST" && parts[0] === "recipes" && parts[1] && parts[2] === "like") return likeRecipe(request, env, parts[1]);

    if (request.method === "GET" && path === "auth/me") return authMe(request, env);
    if (request.method === "POST" && path === "auth/login") return authLogin(request, env);
    if (request.method === "POST" && path === "auth/register") return authRegister(request, env);
    if (request.method === "POST" && path === "auth/logout") return authLogout(request, env);

    if (request.method === "GET" && path === "me/likes") return myLikes(request, env);

    if (parts[0] === "admin" && parts[1] === "recipes") {
      const user = await requireUser(request, env);
      if (!user || user.role !== "admin") return fail("Admin permission required", 403);
      if (request.method === "GET" && parts.length === 2) return adminList(request, env);
      if (request.method === "POST" && parts.length === 2) return adminCreate(request, env, waitUntil);
      if (request.method === "GET" && parts[2] && parts[3] === "image-status") return adminImageStatus(env, parts[2]);
      if (request.method === "PUT" && parts[2]) return adminUpdate(request, env, parts[2]);
      if (request.method === "DELETE" && parts[2]) return adminDelete(env, parts[2]);
    }

    return fail("API route not found", 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return fail(message, 500);
  }
};

async function listRecipes(request: Request, env: Env) {
  const user = await getUserFromRequest(request, env);
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const category = url.searchParams.get("category")?.trim();
  const categories = await env.DB.prepare("SELECT id, name, sort_order FROM categories WHERE id != 'cat_all_no_use' ORDER BY sort_order ASC").all();

  const where = ["r.status = 'published'"];
  const binds: string[] = [];
  if (category) {
    where.push("r.category_id = ?");
    binds.push(category);
  }
  if (q) {
    where.push("r.name LIKE ?");
    binds.push(`%${q}%`);
  }

  const recipes = await env.DB.prepare(recipeListSql(where.join(" AND "), Boolean(user)))
    .bind(...(user ? [user.id] : []), ...binds)
    .all();
  return ok({
    categories: categories.results.map(mapCategory),
    recipes: recipes.results.map(mapRecipeList),
  });
}

async function getRecipe(request: Request, env: Env, id: string) {
  const user = await getUserFromRequest(request, env);
  const row = await env.DB.prepare(recipeDetailSql(Boolean(user)))
    .bind(...(user ? [user.id] : []), id)
    .first();
  if (!row) return fail("Recipe not found", 404);
  const images = await env.DB.prepare("SELECT id, url, alt FROM recipe_images WHERE recipe_id = ? ORDER BY sort_order ASC").bind(id).all();
  return ok({
    ...mapRecipeDetail(row),
    images: images.results.map((item: Record<string, unknown>) => ({
      id: String(item.id),
      url: String(item.url),
      alt: String(item.alt || ""),
    })),
  });
}

async function likeRecipe(request: Request, env: Env, id: string) {
  const user = await requireUser(request, env);
  if (!user) return fail("Login required", 401);
  const existing = await env.DB.prepare("SELECT user_id FROM likes WHERE user_id = ? AND recipe_id = ?").bind(user.id, id).first();
  if (existing) {
    await env.DB.prepare("DELETE FROM likes WHERE user_id = ? AND recipe_id = ?").bind(user.id, id).run();
  } else {
    await env.DB.prepare("INSERT INTO likes (user_id, recipe_id) VALUES (?, ?)").bind(user.id, id).run();
  }
  const count = await likeCount(env, id);
  return ok({ liked: !existing, likeCount: count });
}

async function authMe(request: Request, env: Env) {
  return ok({ user: await getUserFromRequest(request, env) });
}

async function authRegister(request: Request, env: Env) {
  const body = (await request.json()) as { email: string; name: string; password: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !body.password || body.password.length < 6) return fail("Email and a password of at least 6 characters are required");
  const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) return fail("Email already registered");

  const id = crypto.randomUUID();
  const salt = crypto.randomUUID();
  const role = email === env.ADMIN_EMAIL.toLowerCase() ? "admin" : "user";
  const passwordHash = await hashPassword(body.password, salt);
  await env.DB.prepare("INSERT INTO users (id, email, name, password_hash, salt, role) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, email, body.name?.trim() || email, passwordHash, salt, role)
    .run();
  const user = { id, email, name: body.name?.trim() || email, role: role as "user" | "admin" };
  const headers = await createSession(env, id);
  return json({ data: { user } }, { headers });
}

async function authLogin(request: Request, env: Env) {
  const body = (await request.json()) as { email: string; password: string };
  const email = body.email?.trim().toLowerCase();
  const row = await env.DB.prepare("SELECT id, email, name, role, password_hash, salt FROM users WHERE email = ?").bind(email).first();
  if (!row) return fail("Invalid email or password", 401);
  const passwordHash = await hashPassword(body.password || "", String(row.salt));
  if (passwordHash !== row.password_hash) return fail("Invalid email or password", 401);
  const headers = await createSession(env, String(row.id));
  return json({ data: { user: mapUser(row) } }, { headers });
}

async function authLogout(request: Request, env: Env) {
  const sid = getCookie(request, "sid");
  if (sid) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
  return json({ data: { ok: true } }, { headers: { "Set-Cookie": "sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" } });
}

async function myLikes(request: Request, env: Env) {
  const user = await requireUser(request, env);
  if (!user) return fail("Login required", 401);
  const rows = await env.DB.prepare(recipeListSql("r.status = 'published' AND l_self.user_id IS NOT NULL", true)).bind(user.id).all();
  return ok({ recipes: rows.results.map(mapRecipeList) });
}

async function adminList(request: Request, env: Env) {
  const categories = await env.DB.prepare("SELECT id, name, sort_order FROM categories WHERE id != 'cat_all_no_use' ORDER BY sort_order ASC").all();
  const recipes = await env.DB.prepare(recipeListSql("1 = 1", false)).all();
  return ok({ categories: categories.results.map(mapCategory), recipes: recipes.results.map(mapRecipeList) });
}

async function adminCreate(request: Request, env: Env, waitUntil: (promise: Promise<unknown>) => void) {
  const body = (await request.json()) as Record<string, string>;
  const id = crypto.randomUUID();
  const name = body.name || "Snack";
  const images = [
    placeholderImage(name, "cover"),
    placeholderImage(name, "finished"),
    placeholderImage(name, "table"),
    placeholderImage(name, "detail"),
  ];
  const shouldGenerate = getImageProvider(env) === "dashscope";
  const taskId = shouldGenerate ? await createDashScopeImageTask(env, name).catch((error) => {
    console.error("DashScope task creation failed", error);
    return "";
  }) : "";
  await env.DB.prepare(`
    INSERT INTO recipes (id, category_id, name, summary, region, difficulty, cook_time, servings, ingredients, steps, tips, cover_image_url, status, image_status, image_task_id, image_error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.categoryId, body.name, body.summary || "", body.region || "", body.difficulty || "simple", body.cookTime || "", body.servings || "", body.ingredients, body.steps, body.tips || "", images[0], body.status || "published", taskId ? "generating" : "ready", taskId, taskId ? "" : "DashScope task was not created").run();
  await insertRecipeImages(env, id, name, images.slice(1));
  if (taskId) waitUntil(checkAndAttachDashScopeImages(env, id));
  return ok({ id, imageStatus: taskId ? "generating" : "ready" });
}

async function adminImageStatus(env: Env, id: string) {
  await checkAndAttachDashScopeImages(env, id);
  const row = await env.DB.prepare("SELECT id, image_status, image_error FROM recipes WHERE id = ?").bind(id).first();
  if (!row) return fail("Recipe not found", 404);
  return ok({
    id: String(row.id),
    imageStatus: String(row.image_status || "ready"),
    imageError: String(row.image_error || ""),
  });
}

async function adminUpdate(request: Request, env: Env, id: string) {
  const body = (await request.json()) as Record<string, string>;
  await env.DB.prepare(`
    UPDATE recipes SET category_id = ?, name = ?, summary = ?, region = ?, difficulty = ?, cook_time = ?, servings = ?, ingredients = ?, steps = ?, tips = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.categoryId, body.name, body.summary || "", body.region || "", body.difficulty || "simple", body.cookTime || "", body.servings || "", body.ingredients, body.steps, body.tips || "", body.status || "published", id).run();
  return ok({ id });
}

async function adminDelete(env: Env, id: string) {
  await env.DB.prepare("DELETE FROM recipes WHERE id = ?").bind(id).run();
  return ok({ ok: true });
}

async function getImage(env: Env, key: string) {
  if (!env.FOOD_IMAGES) return fail("Image bucket is not configured", 500);
  const object = await env.FOOD_IMAGES.get(key);
  if (!object) return fail("Image not found", 404);
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

async function insertRecipeImages(env: Env, recipeId: string, name: string, urls: string[]) {
  for (let index = 0; index < urls.length; index += 1) {
    await env.DB.prepare("INSERT INTO recipe_images (id, recipe_id, url, alt, sort_order) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), recipeId, urls[index], `${name} image ${index + 1}`, index)
      .run();
  }
}

async function generateAndAttachImages(env: Env, recipeId: string, name: string) {
  try {
    const images = await generateImages(env, name);
    await env.DB.prepare("UPDATE recipes SET cover_image_url = ?, image_status = 'ready', updated_at = datetime('now') WHERE id = ?")
      .bind(images[0], recipeId)
      .run();
    await env.DB.prepare("DELETE FROM recipe_images WHERE recipe_id = ?").bind(recipeId).run();
    await insertRecipeImages(env, recipeId, name, images.slice(1));
  } catch (error) {
    console.error("Background image generation failed", error);
    await env.DB.prepare("UPDATE recipes SET image_status = 'failed', updated_at = datetime('now') WHERE id = ?").bind(recipeId).run();
  }
}

async function checkAndAttachDashScopeImages(env: Env, recipeId: string) {
  const row = await env.DB.prepare("SELECT id, name, image_status, image_task_id FROM recipes WHERE id = ?").bind(recipeId).first();
  if (!row || row.image_status !== "generating" || !row.image_task_id) return;
  try {
    const urls = await pollDashScopeTaskOnce(env, String(row.image_task_id));
    if (!urls) return;
    const images = await persistGeneratedImages(env, String(row.name), urls);
    await env.DB.prepare("UPDATE recipes SET cover_image_url = ?, image_status = 'ready', image_error = '', updated_at = datetime('now') WHERE id = ?")
      .bind(images[0], recipeId)
      .run();
    await env.DB.prepare("DELETE FROM recipe_images WHERE recipe_id = ?").bind(recipeId).run();
    await insertRecipeImages(env, recipeId, String(row.name), images.slice(1));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    console.error("Image status check failed", error);
    await env.DB.prepare("UPDATE recipes SET image_status = 'failed', image_error = ?, updated_at = datetime('now') WHERE id = ?").bind(message, recipeId).run();
  }
}

async function generateImages(env: Env, name: string) {
  const provider = getImageProvider(env);
  if (provider === "dashscope") {
    try {
      return await generateDashScopeImages(env, name);
    } catch (error) {
      console.error("DashScope image generation failed", error);
    }
  }

  if (provider !== "placeholder") {
    console.warn(`Unknown IMAGE_PROVIDER: ${provider}`);
  }
  return [
    placeholderImage(name, "cover"),
    placeholderImage(name, "finished"),
    placeholderImage(name, "table"),
    placeholderImage(name, "detail"),
  ];
}

function getImageProvider(env: Env) {
  return env.IMAGE_PROVIDER || (env.DASHSCOPE_API_KEY || env.IMAGE_API_KEY ? "dashscope" : "placeholder");
}

type DashScopeTaskResponse = {
  output?: {
    task_id?: string;
    task_status?: string;
    results?: Array<{ url?: string; code?: string; message?: string }>;
    code?: string;
    message?: string;
  };
  code?: string;
  message?: string;
};

async function generateDashScopeImages(env: Env, name: string) {
  const taskId = await createDashScopeImageTask(env, name);
  for (let attempt = 0; attempt < 36; attempt += 1) {
    await sleep(2500);
    const urls = await pollDashScopeTaskOnce(env, taskId);
    if (urls) return persistGeneratedImages(env, name, urls);
  }

  throw new Error("DashScope image task timed out");
}

async function createDashScopeImageTask(env: Env, name: string) {
  const apiKey = env.DASHSCOPE_API_KEY || env.IMAGE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY is not configured");

  const prompt = [
    `Chinese street snack food photography: ${name}.`,
    "Warm natural light, appetizing finished dish, clean ceramic plate, bamboo and warm home kitchen mood.",
    "No text, no watermark, no logo, realistic commercial food photography.",
    "Create four varied shots: cover, finished dish, table scene, close-up detail.",
  ].join(" ");

  const createRes = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
    method: "POST",
    headers: dashScopeHeaders(apiKey, env),
    body: JSON.stringify({
      model: "wanx-v1",
      input: { prompt },
      parameters: {
        style: "<photography>",
        size: "1024*1024",
        n: 4,
      },
    }),
  });
  const created = (await createRes.json()) as DashScopeTaskResponse;
  if (!createRes.ok || !created.output?.task_id) {
    throw new Error(created.message || created.output?.message || "Failed to create DashScope image task");
  }

  return created.output.task_id;
}

async function pollDashScopeTaskOnce(env: Env, taskId: string) {
  const apiKey = env.DASHSCOPE_API_KEY || env.IMAGE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY is not configured");
  const pollRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const task = (await pollRes.json()) as DashScopeTaskResponse;
  const status = task.output?.task_status;
  if (status === "SUCCEEDED") {
    const urls = (task.output?.results || []).map((item) => item.url).filter((url): url is string => Boolean(url));
    if (!urls.length) throw new Error("DashScope returned no image URLs");
    return urls;
  }
  if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
    throw new Error(task.output?.message || `DashScope task ${status}`);
  }
  return null;
}

function dashScopeHeaders(apiKey: string, env: Env) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-DashScope-Async": "enable",
  };
  if (env.DASHSCOPE_WORKSPACE) headers["X-DashScope-WorkSpace"] = env.DASHSCOPE_WORKSPACE;
  return headers;
}

async function persistGeneratedImages(env: Env, name: string, urls: string[]) {
  const normalized = [...urls];
  while (normalized.length < 4) normalized.push(placeholderImage(name, `fallback-${normalized.length + 1}`));
  if (!env.FOOD_IMAGES) return normalized.slice(0, 4);

  const saved: string[] = [];
  for (let index = 0; index < normalized.slice(0, 4).length; index += 1) {
    const sourceUrl = normalized[index];
    if (sourceUrl.startsWith("https://placehold.co/")) {
      saved.push(sourceUrl);
      continue;
    }
    const res = await fetch(sourceUrl);
    if (!res.ok || !res.body) throw new Error(`Failed to download generated image ${index + 1}`);
    const contentType = res.headers.get("Content-Type") || "image/png";
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    const key = `recipes/${crypto.randomUUID()}-${slugify(name)}-${index + 1}.${ext}`;
    await env.FOOD_IMAGES.put(key, res.body, {
      httpMetadata: { contentType },
    });
    saved.push(`/api/images/${key}`);
  }
  return saved;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value: string) {
  return encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, "-")).replaceAll("%", "");
}

function placeholderImage(name: string, scene: string) {
  return `https://placehold.co/1200x900/FDEBD4/385225?text=${encodeURIComponent(`${name} ${scene}`)}`;
}

async function createSession(env: Env, userId: string) {
  const sid = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").bind(sid, userId, expires.toISOString()).run();
  return {
    "Set-Cookie": `sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  };
}

async function requireUser(request: Request, env: Env) {
  return getUserFromRequest(request, env);
}

async function getUserFromRequest(request: Request, env: Env): Promise<SessionUser | null> {
  const sid = getCookie(request, "sid");
  if (!sid) return null;
  const row = await env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).bind(sid).first();
  return row ? mapUser(row) : null;
}

function getCookie(request: Request, name: string) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function likeCount(env: Env, recipeId: string) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM likes WHERE recipe_id = ?").bind(recipeId).first();
  return Number(row?.count || 0);
}

function recipeListSql(where: string, hasUser: boolean) {
  const userJoin = hasUser ? "LEFT JOIN likes l_self ON l_self.recipe_id = r.id AND l_self.user_id = ?" : "LEFT JOIN likes l_self ON 1 = 0";
  return `
    SELECT r.id, r.name, r.summary, r.category_id, c.name AS category_name, r.region, r.difficulty, r.cook_time, r.cover_image_url,
      COUNT(l.recipe_id) AS like_count,
      CASE WHEN l_self.user_id IS NULL THEN 0 ELSE 1 END AS liked
    FROM recipes r
    JOIN categories c ON c.id = r.category_id
    LEFT JOIN likes l ON l.recipe_id = r.id
    ${userJoin}
    WHERE ${where}
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `;
}

function recipeDetailSql(hasUser: boolean) {
  return `
    SELECT r.*, c.name AS category_name,
      COUNT(l.recipe_id) AS like_count,
      CASE WHEN l_self.user_id IS NULL THEN 0 ELSE 1 END AS liked
    FROM recipes r
    JOIN categories c ON c.id = r.category_id
    LEFT JOIN likes l ON l.recipe_id = r.id
    ${hasUser ? "LEFT JOIN likes l_self ON l_self.recipe_id = r.id AND l_self.user_id = ?" : "LEFT JOIN likes l_self ON 1 = 0"}
    WHERE r.id = ?
    GROUP BY r.id
  `;
}

function mapCategory(row: Record<string, unknown>) {
  return { id: String(row.id), name: String(row.name), sortOrder: Number(row.sort_order) };
}

function mapUser(row: Record<string, unknown>): SessionUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role === "admin" ? "admin" : "user",
  };
}

function mapRecipeList(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    summary: String(row.summary || ""),
    categoryId: String(row.category_id),
    categoryName: String(row.category_name),
    region: String(row.region || ""),
    difficulty: String(row.difficulty || "simple"),
    cookTime: String(row.cook_time || ""),
    coverImageUrl: String(row.cover_image_url || ""),
    likeCount: Number(row.like_count || 0),
    liked: Boolean(row.liked),
    imageStatus: row.image_status === "generating" || row.image_status === "failed" ? String(row.image_status) : "ready",
  };
}

function mapRecipeDetail(row: Record<string, unknown>) {
  return {
    ...mapRecipeList(row),
    servings: String(row.servings || ""),
    ingredients: String(row.ingredients || ""),
    steps: String(row.steps || ""),
    tips: String(row.tips || ""),
  };
}
