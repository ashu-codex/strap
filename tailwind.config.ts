import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          subtle: "var(--surface-2)",
          border: "hsl(var(--border))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        brand: {
          50: "#f7fee7",
          100: "#ecfccb",
          200: "#d9f99d",
          300: "#B7F34A",
          400: "#a8e63c",
          500: "#84cc16",
          600: "#65a30d",
          700: "#4d7c0f",
          800: "#3f6212",
          900: "#365314",
          DEFAULT: "#B7F34A",
          neon: "#c6ff00",
        },
        charcoal: {
          50: "#27272a",
          100: "#222227",
          200: "#1a1a20",
          300: "#141418",
          400: "#0f0f13",
          500: "#0a0a0d",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(183, 243, 74, 0.25)",
        "glow-lg": "0 0 40px -5px rgba(183, 243, 74, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
