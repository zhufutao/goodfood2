export type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

export type RecipeListItem = {
  id: string;
  name: string;
  summary: string;
  categoryId: string;
  categoryName: string;
  region: string;
  difficulty: string;
  cookTime: string;
  coverImageUrl: string;
  likeCount: number;
  liked: boolean;
};

export type RecipeDetail = RecipeListItem & {
  servings: string;
  ingredients: string;
  steps: string;
  tips: string;
  images: Array<{ id: string; url: string; alt: string }>;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

export type ApiResponse<T> = {
  data: T;
};
