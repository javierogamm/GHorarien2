import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "category-1": "#6366F1",
        "category-2": "#10B981",
        "category-3": "#F59E0B",
        "category-4": "#EC4899"
      },
      boxShadow: {
        soft: "0 15px 35px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
