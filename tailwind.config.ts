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
        background: "var(--page-bg)",
        foreground: "var(--text-color)",
        surface: {
          DEFAULT: "var(--surface)",
          subtle: "var(--surface-subtle)",
          border: "var(--border-color)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-color)",
          border: "var(--border-color)",
        },
        brand: {
          DEFAULT: "#B7F34A",
          hover: "#A7E438",
          dark: "#111318",
          50: "#f7fee7",
          100: "#ecfccb",
          200: "#d9f99d",
          300: "#B7F34A",
          400: "#A7E438",
          500: "#84cc16",
          600: "#65a30d",
          700: "#4d7c0f",
          800: "#3f6212",
          900: "#365314",
        },
        strap: {
          lime: "#B7F34A",
          limeHover: "#A7E438",
          darkBg: "#101114",
          darkSurface: "#1B1D22",
          darkBorder: "#30333A",
          lightBg: "#F5F6F8",
          lightSurface: "#FFFFFF",
          lightBorder: "#E1E4E8",
          darkText: "#111318",
          lightText: "#17191D",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        btn: "10px",
      },
      boxShadow: {
        glow: "0 0 22px -5px rgba(183, 243, 74, 0.35)",
        "glow-lg": "0 0 35px -5px rgba(183, 243, 74, 0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
