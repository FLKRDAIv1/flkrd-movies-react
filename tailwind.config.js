/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: '#e50914',
        'main-bg': '#000000',
        'main-text': '#ffffff',
        'sec-text': '#a3a3a3',
        'card-bg': '#0a0a0a',
        'box-bg': '#141414',
        'border-color': '#262626',
      }
    },
  },
  plugins: [],
}
