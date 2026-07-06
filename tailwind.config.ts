import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta premium: índigo → violeta, moderna y con carácter.
        brand: {
          50: "#f2f1ff",
          100: "#e7e5ff",
          200: "#d1ccff",
          300: "#b3a9ff",
          400: "#9280fb",
          500: "#7a63f5",
          600: "#6a48ea",
          700: "#5a37cf",
          800: "#4a2ea6",
          900: "#3e2a83",
        },
        // Acentos por persona, más ricos y con variante profunda.
        tony: {
          soft: "#e0f2fe",
          DEFAULT: "#0ea5e9",
          deep: "#0369a1",
        },
        sol: {
          soft: "#fce7f3",
          DEFAULT: "#ec4899",
          deep: "#be185d",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        // Sombras suaves y estratificadas + glows con color de marca.
        card: "0 1px 2px rgba(23,17,54,0.04), 0 4px 16px -4px rgba(23,17,54,0.08)",
        soft: "0 12px 40px -8px rgba(23,17,54,0.16)",
        float: "0 20px 50px -12px rgba(23,17,54,0.22)",
        glow: "0 10px 30px -8px rgba(106,72,234,0.5)",
        "glow-sm": "0 6px 18px -6px rgba(106,72,234,0.45)",
        "inner-sheen": "inset 0 1px 0 0 rgba(255,255,255,0.6)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #7a63f5 0%, #6a48ea 45%, #a855f7 100%)",
        "brand-mesh":
          "radial-gradient(120% 120% at 0% 0%, #8b6ef6 0%, transparent 55%), radial-gradient(120% 120% at 100% 20%, #c026d3 0%, transparent 50%), linear-gradient(135deg, #6a48ea 0%, #5a37cf 100%)",
        "emerald-gradient": "linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)",
        sheen: "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.55) 50%, transparent 75%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-16px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-up-sheet": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.06)" },
        },
        "count-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "slide-down": "slide-down 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "slide-up-sheet": "slide-up-sheet 0.4s cubic-bezier(0.22,1,0.36,1) both",
        pop: "pop 0.4s cubic-bezier(0.22,1,0.36,1)",
        shimmer: "shimmer 1.8s infinite",
        "gradient-pan": "gradient-pan 8s ease infinite",
        float: "float 5s ease-in-out infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "count-in": "count-in 0.5s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
