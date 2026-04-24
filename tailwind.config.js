/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: 'var(--brand-red)',
        'main-bg': 'var(--bg-primary)',
        'main-text': 'var(--text-primary)',
        'sec-text': 'var(--text-secondary)',
        'card-bg': 'var(--card-bg)',
        'box-bg': 'var(--box-bg)',
        'border-color': 'var(--border-color)',
      }
    },
  },
  plugins: [],
}
