import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "category-1": "#6FBF73",
        "category-2": "#7DD3FC",
        "category-3": "#F2A65A",
        "category-4": "#E46E64"
      },
      boxShadow: {
        soft: "0 15px 35px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
