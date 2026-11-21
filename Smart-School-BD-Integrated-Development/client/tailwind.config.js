/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Bengali"', '"Hind Siliguri"', "system-ui", "sans-serif"],
      },
      colors: {
        brand: { 50: "#e7f5ee", 100: "#c9e8d8", 500: "#00875a", 600: "#007a50", 700: "#006a4e", 900: "#064b39" },
        flag: { red: "#f42a41", green: "#006a4e" },
      },
      boxShadow: { soft: "0 8px 30px rgba(15, 45, 39, .06)" },
    },
  },
  plugins: [],
};