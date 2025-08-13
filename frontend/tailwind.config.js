/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#284b63",
          700: "#1e3a5f",
          800: "#172e46",
          900: "#0c1929",
        },
        secondary: {
          50: "#f6fbfc",
          100: "#edf6f8",
          200: "#d6ecf1",
          300: "#b5dce5",
          400: "#8cc6d4",
          500: "#3c6e71",
          600: "#2d5457",
          700: "#244549",
          800: "#1d373a",
          900: "#18292c",
        },
        gray: {
          50: "#ffffff",
          100: "#f9fafb",
          200: "#f4f5f7",
          300: "#e5e7eb",
          400: "#d1d5db",
          500: "#d9d9d9",
          600: "#6b7280",
          700: "#374151",
          800: "#353535",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        card: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)",
      },
    },
  },
  plugins: [],
};
