/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        black: "#0A0A0A",
        surface: "#111111",
        border: "#1F1F1F",
        green: {
          DEFAULT: "#4ADE80",
          muted: "#16A34A",
          subtle: "#052e16"
        },
        blue: {
          DEFAULT: "#7DD3FC",
          muted: "#0284C7",
          subtle: "#082f49"
        },
        text: {
          primary: "#F9FAFB",
          secondary: "#9CA3AF",
          tertiary: "#4B5563"
        }
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};

