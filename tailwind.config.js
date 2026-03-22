/** @type {import('tailwindcss').Config} */
export default {
  // 【關鍵修復】強制 Tailwind 聽從 HTML class 的指揮，忽略系統預設
  darkMode: 'class', 
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
