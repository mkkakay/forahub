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
        // Semantic theme tokens — backed by CSS variables in globals.css.
        // Prefer these over raw color classes so components respond to the
        // active theme automatically (light, dark, high-contrast).
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        default: "var(--border)", // for border-default / divide-default
        accent: {
          DEFAULT: "var(--accent)",
          fg: "var(--accent-fg)",
        },
      },
      borderColor: {
        DEFAULT: "var(--border)",
        default: "var(--border)",
      },
      divideColor: {
        default: "var(--divide)",
      },
      ringColor: {
        accent: "var(--ring)",
      },
      animation: {
        shimmer: "shimmer 1.5s infinite linear",
        "fade-in": "fade-in 0.3s ease-out",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
