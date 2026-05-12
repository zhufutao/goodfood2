import { Clock3, Heart, LogOut, Search, Shield, Sparkles, UserRound, Utensils } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  adminCreate,
  adminDelete,
  adminImageStatus,
  adminList,
  adminRegenerateImages,
  adminUpdate,
  getHomeData,
  getLikedRecipes,
  getMe,
  getRecipe,
  login,
  logout,
  register,
  toggleLike,
  type RecipePayload,
} from "./api";
import type { Category, RecipeDetail, RecipeListItem, User } from "./types";

const emptyPayload: RecipePayload = {
  name: "",
  categoryId: "cat_noodles",
  summary: "",
  region: "",
  difficulty: "简单",
  cookTime: "",
  servings: "",
  ingredients: "",
  steps: "",
  tips: "",
  status: "published",
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.user))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <Shell user={user} setUser={setUser}><PageLoading /></Shell>;

  return (
    <Shell user={user} setUser={setUser}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipes/:id" element={<Detail user={user} />} />
        <Route path="/login" element={<Auth mode="login" setUser={setUser} />} />
        <Route path="/register" element={<Auth mode="register" setUser={setUser} />} />
        <Route path="/me" element={user ? <UserCenter /> : <Navigate to="/login" replace />} />
        <Route path="/admin" element={user?.role === "admin" ? <Admin /> : <Navigate to="/login" replace />} />
      </Routes>
    </Shell>
  );
}

function Shell({ children, user, setUser }: { children: React.ReactNode; user: User | null; setUser: (u: User | null) => void }) {
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    setUser(null);
    navigate("/");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-appetite-100/80 bg-appetite-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bamboo-700 text-white">
              <Utensils size={20} />
            </span>
            <span>
              <span className="block text-lg font-bold text-ink">青竹小吃</span>
              <span className="hidden text-xs text-bamboo-700 sm:block">家常烟火气，热乎小滋味</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            {user?.role === "admin" && (
              <Link className="hidden items-center gap-1 rounded-full px-3 py-2 text-bamboo-700 hover:bg-bamboo-100 sm:flex" to="/admin">
                <Shield size={16} /> 后台
              </Link>
            )}
            {user ? (
              <>
                <Link className="flex items-center gap-1 rounded-full px-3 py-2 text-bamboo-700 hover:bg-bamboo-100" to="/me">
                  <UserRound size={16} /> {user.name}
                </Link>
                <button className="rounded-full p-2 text-ink hover:bg-appetite-100" onClick={onLogout} title="退出">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link className="rounded-full bg-ink px-4 py-2 font-medium text-white hover:bg-appetite-700" to="/login">
                登录
              </Link>
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

function Home() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const q = params.get("q") || "";
  const category = params.get("category") || "";

  useEffect(() => {
    setLoading(true);
    getHomeData({ q, category })
      .then((res) => {
        setCategories(res.categories);
        setRecipes(res.recipes);
      })
      .finally(() => setLoading(false));
  }, [q, category]);

  function setFilter(next: { q?: string; category?: string }) {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value) merged.set(key, value);
      else merged.delete(key);
    });
    setParams(merged);
  }

  return (
    <main className="home-canvas">
      <section className="mx-auto grid max-w-6xl gap-7 px-4 pb-7 pt-6 sm:pt-8 md:grid-cols-[1.02fr_0.98fr] md:gap-10 md:pb-10 md:pt-12">
        <div className="relative flex flex-col justify-center">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-appetite-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-appetite-700 shadow-sm">
            <Sparkles size={14} /> 每日小吃配方
          </div>
          <h1 className="home-title max-w-2xl text-4xl font-black leading-[1.04] text-ink sm:text-5xl md:text-6xl">把街边热乎味道，带回家做。</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-stone-700 md:text-lg">
            分类找小吃，按名字搜索，收藏常做配方。青竹小吃把夜市、早餐摊和家常锅气整理成一张温暖菜单。
          </p>
          <div className="mt-7 flex max-w-xl items-center gap-3 rounded-2xl border border-appetite-100 bg-white/95 px-4 py-3 shadow-soft sm:rounded-full">
            <Search className="shrink-0 text-appetite-700" size={20} />
            <input
              className="w-full bg-transparent text-base outline-none placeholder:text-stone-400"
              placeholder="搜索小吃名称，例如 葱油饼"
              value={q}
              onChange={(e) => setFilter({ q: e.target.value })}
            />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-stone-600 sm:max-w-xl sm:text-sm">
            <div className="rounded-2xl border border-white bg-white/70 px-3 py-3"><b className="block text-lg text-ink">{recipes.length}</b>当前菜单</div>
            <div className="rounded-2xl border border-white bg-white/70 px-3 py-3"><b className="block text-lg text-ink">{categories.length}</b>小吃分类</div>
            <div className="rounded-2xl border border-white bg-white/70 px-3 py-3"><b className="block text-lg text-ink">AI</b>生成配图</div>
          </div>
        </div>
        <div className="home-photo-board relative min-h-[19rem] overflow-hidden rounded-[1.75rem] border border-white/80 bg-white p-2 shadow-soft sm:min-h-[25rem] sm:rounded-[2.25rem]">
          <img src="https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1000&q=80" className="absolute inset-x-2 top-2 h-[58%] w-[calc(100%-1rem)] rounded-[1.35rem] object-cover sm:rounded-[1.85rem]" alt="热炒小吃" />
          <img src="https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=700&q=80" className="absolute bottom-2 left-2 h-[38%] w-[48%] rounded-[1.25rem] object-cover sm:rounded-[1.6rem]" alt="家常炒饭" />
          <img src="https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=700&q=80" className="absolute bottom-2 right-2 h-[38%] w-[48%] rounded-[1.25rem] object-cover sm:rounded-[1.6rem]" alt="面点小吃" />
          <div className="absolute bottom-[34%] left-5 right-5 rounded-2xl border border-white/70 bg-ink/88 px-4 py-3 text-white shadow-soft backdrop-blur">
            <p className="text-xs font-semibold text-appetite-100">今晚推荐</p>
            <p className="mt-1 text-lg font-bold">一份热乎小吃，配一碗清粥。</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="sticky top-[65px] z-20 -mx-4 mb-6 border-y border-appetite-100/70 bg-appetite-50/85 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
          <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilter({ category: "" })} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${!category ? "bg-bamboo-700 text-white shadow-md" : "bg-white text-ink hover:bg-bamboo-100"}`}>
            全部
          </button>
          {categories.map((item) => (
            <button key={item.id} onClick={() => setFilter({ category: item.id })} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${category === item.id ? "bg-bamboo-700 text-white shadow-md" : "bg-white text-ink hover:bg-bamboo-100"}`}>
              {item.name}
            </button>
          ))}
          </div>
        </div>
        {loading ? <PageLoading /> : <RecipeGrid recipes={recipes} emptyText="暂无匹配的小吃" />}
      </section>
    </main>
  );
}

function RecipeGrid({ recipes, emptyText }: { recipes: RecipeListItem[]; emptyText: string }) {
  if (!recipes.length) return <div className="rounded-2xl bg-white p-10 text-center text-stone-600 shadow-soft">{emptyText}</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {recipes.map((recipe) => (
        <Link to={`/recipes/${recipe.id}`} key={recipe.id} className="group overflow-hidden rounded-[1.4rem] border border-white/80 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-xl">
          <div className="relative aspect-[4/3] overflow-hidden bg-appetite-100">
            <img src={recipe.coverImageUrl || placeholder(recipe.name)} alt={recipe.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-bamboo-700 shadow-sm">{recipe.categoryName}</span>
            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-ink/85 px-3 py-1 text-xs font-bold text-white backdrop-blur"><Heart size={14} fill={recipe.liked ? "currentColor" : "none"} /> {recipe.likeCount}</span>
          </div>
          <div className="p-4 sm:p-5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-xl font-black leading-tight text-ink">{recipe.name}</h3>
              <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full bg-appetite-50 px-2.5 py-1 text-xs font-bold text-appetite-700"><Clock3 size={13} /> {recipe.cookTime || "快手"}</span>
            </div>
            <p className="line-clamp-2 min-h-12 text-sm leading-6 text-stone-600">{recipe.summary}</p>
            <div className="mt-4 flex items-center justify-between border-t border-appetite-100 pt-3 text-sm text-stone-600">
              <span>{recipe.region || "家常"} · {recipe.difficulty}</span>
              <span className="text-xs font-semibold text-bamboo-700">查看配方</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Detail({ user }: { user: User | null }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getRecipe(id).then(setRecipe).catch((err) => setError(err.message));
  }, [id]);

  async function onLike() {
    if (!user) {
      navigate("/login");
      return;
    }
    const res = await toggleLike(id);
    setRecipe((prev) => prev ? { ...prev, liked: res.liked, likeCount: res.likeCount } : prev);
  }

  if (error) return <Message text={error} />;
  if (!recipe) return <PageLoading />;

  const images = recipe.images.length ? recipe.images : [0, 1, 2].map((n) => ({ id: String(n), url: placeholder(`${recipe.name}-${n}`), alt: recipe.name }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
        <div className="grid grid-cols-2 gap-3">
          <img src={images[0].url} alt={images[0].alt} className="col-span-2 aspect-[16/9] w-full rounded-2xl object-cover shadow-soft" />
          {images.slice(1, 3).map((image) => (
            <img key={image.id} src={image.url} alt={image.alt} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-soft" />
          ))}
        </div>
        <section className="poster-paper rounded-3xl border border-appetite-100 p-6 shadow-soft md:p-8">
          <p className="text-sm font-semibold text-appetite-700">{recipe.categoryName} · {recipe.region || "家常风味"}</p>
          <h1 className="mt-2 text-4xl font-bold text-ink">{recipe.name}</h1>
          <p className="mt-4 leading-7 text-stone-700">{recipe.summary}</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
            <Badge label="难度" value={recipe.difficulty} />
            <Badge label="时间" value={recipe.cookTime || "适中"} />
            <Badge label="份量" value={recipe.servings || "家常"} />
          </div>
          <button onClick={onLike} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-appetite-500 px-5 py-3 font-semibold text-white hover:bg-appetite-700">
            <Heart size={20} fill={recipe.liked ? "currentColor" : "none"} /> {recipe.liked ? "已点赞" : "点赞配方"} · {recipe.likeCount}
          </button>
        </section>
      </div>
      <section className="mt-8 grid gap-6 md:grid-cols-[0.85fr_1.15fr]">
        <PosterBlock title="配方">{recipe.ingredients}</PosterBlock>
        <PosterBlock title="制作步骤">{recipe.steps}</PosterBlock>
      </section>
      {recipe.tips && <section className="mt-6 rounded-2xl bg-white p-6 shadow-soft"><h2 className="mb-3 text-xl font-bold">小贴士</h2><p className="whitespace-pre-line leading-7 text-stone-700">{recipe.tips}</p></section>}
    </main>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/80 p-3"><div className="text-xs text-stone-500">{label}</div><div className="mt-1 font-bold text-ink">{value}</div></div>;
}

function PosterBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className="poster-paper rounded-3xl border border-appetite-100 p-6 shadow-soft">
      <h2 className="mb-4 text-2xl font-bold text-ink">{title}</h2>
      <p className="whitespace-pre-line leading-8 text-stone-700">{children}</p>
    </div>
  );
}

function Auth({ mode, setUser }: { mode: "login" | "register"; setUser: (u: User) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(mode === "login" ? "admin@goodfood" : "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = mode === "login" ? await login(email, password) : await register(email, name, password);
      setUser(res.user);
      navigate(res.user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    }
  }

  return (
    <main className="mx-auto flex max-w-md px-4 py-12">
      <form onSubmit={submit} className="w-full rounded-3xl bg-white p-7 shadow-soft">
        <h1 className="text-3xl font-bold text-ink">{mode === "login" ? "登录" : "注册"}</h1>
        <p className="mt-2 text-sm text-stone-600">{mode === "login" ? "点赞和后台管理需要登录。" : "注册后可以保存喜欢的小吃配方。"}</p>
        <div className="mt-6 space-y-4">
          <Input label="邮箱" value={email} onChange={setEmail} />
          {mode === "register" && <Input label="昵称" value={name} onChange={setName} />}
          <Input label="密码" type="password" value={password} onChange={setPassword} />
        </div>
        {error && <p className="mt-4 text-sm text-appetite-700">{error}</p>}
        <button className="mt-6 w-full rounded-full bg-ink px-5 py-3 font-semibold text-white">{mode === "login" ? "登录" : "注册"}</button>
        <Link className="mt-4 block text-center text-sm text-bamboo-700" to={mode === "login" ? "/register" : "/login"}>
          {mode === "login" ? "还没有账号？去注册" : "已有账号？去登录"}
        </Link>
      </form>
    </main>
  );
}

function UserCenter() {
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  useEffect(() => { getLikedRecipes().then((res) => setRecipes(res.recipes)); }, []);
  return <main className="mx-auto max-w-6xl px-4 py-8"><h1 className="mb-6 text-3xl font-bold">我点赞的小吃</h1><RecipeGrid recipes={recipes} emptyText="还没有点赞任何配方" /></main>;
}

function Admin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [form, setForm] = useState<RecipePayload>(emptyPayload);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => recipes.find((r) => r.id === editing), [recipes, editing]);

  async function refresh() {
    const res = await adminList();
    setCategories(res.categories);
    setRecipes(res.recipes);
  }

  useEffect(() => { refresh(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      if (editing) {
        await adminUpdate(editing, form);
        setMessage("已保存修改。");
      } else {
        const created = await adminCreate(form);
        setMessage(created.imageStatus === "generating" ? "已保存，图片正在生成中..." : "已保存。");
        if (created.imageStatus === "generating") pollImageStatus(created.id);
      }
      setForm(emptyPayload);
      setEditing(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function pollImageStatus(id: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const status = await adminImageStatus(id);
      if (status.imageStatus === "ready") {
        setMessage("图片已生成完成。");
        await refresh();
        return;
      }
      if (status.imageStatus === "failed") {
        setMessage(`图片生成失败：${status.imageError || "请稍后重试"}`);
        await refresh();
        return;
      }
    }
    setMessage("图片仍在生成中，稍后刷新页面查看结果。");
  }

  async function remove(id: string) {
    await adminDelete(id);
    await refresh();
  }

  async function regenerateImages(id: string) {
    setMessage("已开始重新生成图片...");
    await adminRegenerateImages(id);
    await refresh();
    pollImageStatus(id);
  }

  function edit(recipe: RecipeListItem) {
    getRecipe(recipe.id).then((detail) => {
      setEditing(recipe.id);
      setForm({
        name: detail.name,
        categoryId: detail.categoryId,
        summary: detail.summary,
        region: detail.region,
        difficulty: detail.difficulty,
        cookTime: detail.cookTime,
        servings: detail.servings,
        ingredients: detail.ingredients,
        steps: detail.steps,
        tips: detail.tips,
        status: "published",
      });
    });
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.95fr_1.05fr]">
      <form onSubmit={submit} className="relative rounded-3xl bg-white p-6 shadow-soft">
        {saving && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/80 backdrop-blur-sm">
            <div className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-soft">正在保存...</div>
          </div>
        )}
        <h1 className="text-2xl font-bold">{editing ? `编辑：${selected?.name || ""}` : "新增小吃配方"}</h1>
        <div className="mt-5 grid gap-4">
          <Input label="名称" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <label className="text-sm font-medium text-stone-700">分类<select className="mt-1 w-full rounded-xl border border-appetite-100 px-3 py-2 outline-none focus:border-bamboo-500" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <Input label="简介" value={form.summary} onChange={(v) => setForm({ ...form, summary: v })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="地区" value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
            <Input label="时间" value={form.cookTime} onChange={(v) => setForm({ ...form, cookTime: v })} />
            <Input label="份量" value={form.servings} onChange={(v) => setForm({ ...form, servings: v })} />
          </div>
          <Textarea label="配方" value={form.ingredients} onChange={(v) => setForm({ ...form, ingredients: v })} />
          <Textarea label="制作过程" value={form.steps} onChange={(v) => setForm({ ...form, steps: v })} />
          <Textarea label="小贴士" value={form.tips} onChange={(v) => setForm({ ...form, tips: v })} />
        </div>
        {message && <p className="mt-4 text-sm text-bamboo-700">{message}</p>}
        <div className="mt-5 flex gap-3">
          <button disabled={saving} className="rounded-full bg-ink px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? "保存中..." : "保存"}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyPayload); }} className="rounded-full bg-appetite-100 px-5 py-3 font-semibold text-ink">取消</button>}
        </div>
      </form>
      <section className="rounded-3xl bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-2xl font-bold">配方列表</h2>
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="flex items-center gap-3 rounded-2xl border border-appetite-100 p-3">
              <img src={recipe.coverImageUrl || placeholder(recipe.name)} className="h-16 w-20 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-bold">
                  {recipe.name}
                  {recipe.imageStatus === "generating" && <span className="rounded-full bg-appetite-100 px-2 py-0.5 text-xs font-medium text-appetite-700">生成中</span>}
                  {recipe.imageStatus === "failed" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">生成失败</span>}
                </div>
                <div className="truncate text-sm text-stone-600">{recipe.summary}</div>
              </div>
              <button onClick={() => regenerateImages(recipe.id)} className="rounded-full bg-appetite-100 px-3 py-2 text-sm text-appetite-700">重新生成图片</button>
              <button onClick={() => edit(recipe)} className="rounded-full bg-bamboo-100 px-3 py-2 text-sm text-bamboo-700">修改</button>
              <button onClick={() => remove(recipe.id)} className="rounded-full bg-appetite-100 px-3 py-2 text-sm text-appetite-700">删除</button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <label className="block text-sm font-medium text-stone-700">{label}<input required className="mt-1 w-full rounded-xl border border-appetite-100 px-3 py-2 outline-none focus:border-bamboo-500" type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block text-sm font-medium text-stone-700">{label}<textarea required rows={5} className="mt-1 w-full rounded-xl border border-appetite-100 px-3 py-2 outline-none focus:border-bamboo-500" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function PageLoading() {
  return <div className="mx-auto max-w-6xl px-4 py-12 text-center text-stone-600">加载中...</div>;
}

function Message({ text }: { text: string }) {
  return <div className="mx-auto max-w-3xl px-4 py-12 text-center text-stone-700">{text}</div>;
}

function placeholder(text: string) {
  const encoded = encodeURIComponent(text.slice(0, 16));
  return `https://placehold.co/900x700/FDEBD4/385225?text=${encoded}`;
}

export default App;
