/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: "#1A56DB"
        },
        dark: "#1A1A2E",
        accent: {
          green: "#22C55E"
        },
        neutral: {
          50: "#F8FAFC",
          100: "#EEF2FF",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827"
        }
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};

