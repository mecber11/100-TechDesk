import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B1C2C", dim: "#07111D" },
        teal: { DEFAULT: "#00C2C8", dark: "#00939A", glow: "#2EE0E6" },
        paper: "#F4FBFC",
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,28,44,.04), 0 12px 32px rgba(11,28,44,.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
