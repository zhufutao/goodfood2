import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bamboo: {
          50: "#f5f8ef",
          100: "#e8efd8",
          500: "#5e7f3f",
          700: "#385225",
        },
        appetite: {
          50: "#fff8ef",
          100: "#fdebd4",
          500: "#d55632",
          700: "#9d351f",
        },
        ink: "#2a221d",
      },
      boxShadow: {
        soft: "0 16px 50px rgba(80, 53, 33, 0.10)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
