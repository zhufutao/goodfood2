import type { ApiResponse, Category, RecipeDetail, RecipeListItem, User } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error || "请求失败");
  }
  return (body as ApiResponse<T>).data;
}

export function getHomeData(params: { category?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.q) search.set("q", params.q);
  return request<{ categories: Category[]; recipes: RecipeListItem[] }>(`/api/recipes?${search}`);
}

export function getRecipe(id: string) {
  return request<RecipeDetail>(`/api/recipes/${id}`);
}

export function getMe() {
  return request<{ user: User | null }>("/api/auth/me");
}

export function login(email: string, password: string) {
  return request<{ user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, name: string, password: string) {
  return request<{ user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, name, password }),
  });
}

export function logout() {
  return request<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export function toggleLike(recipeId: string) {
  return request<{ liked: boolean; likeCount: number }>(`/api/recipes/${recipeId}/like`, {
    method: "POST",
  });
}

export function getLikedRecipes() {
  return request<{ recipes: RecipeListItem[] }>("/api/me/likes");
}

export type RecipePayload = {
  name: string;
  categoryId: string;
  summary: string;
  region: string;
  difficulty: string;
  cookTime: string;
  servings: string;
  ingredients: string;
  steps: string;
  tips: string;
  status: string;
};

export function adminList() {
  return request<{ categories: Category[]; recipes: RecipeListItem[] }>("/api/admin/recipes");
}

export function adminCreate(payload: RecipePayload) {
  return request<{ id: string }>("/api/admin/recipes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adminUpdate(id: string, payload: RecipePayload) {
  return request<{ id: string }>(`/api/admin/recipes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function adminDelete(id: string) {
  return request<{ ok: true }>(`/api/admin/recipes/${id}`, { method: "DELETE" });
}
