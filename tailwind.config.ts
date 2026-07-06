import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta suave, moderna, mobile-first.
        brand: {
          50: "#eef6ff",
          100: "#d9ebff",
          200: "#bcdcff",
          300: "#8ec6ff",
          400: "#59a6ff",
          500: "#3385fb",
          600: "#1f66f0",
          700: "#1850dc",
          800: "#1a43b2",
          900: "#1b3c8c",
        },
        tony: {
          soft: "#e0f2fe",
          DEFAULT: "#0284c7",
        },
        sol: {
          soft: "#fce7f3",
          DEFAULT: "#db2777",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        soft: "0 8px 30px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
