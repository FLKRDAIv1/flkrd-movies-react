/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--brand-red-rgb) / <alpha-value>)',
        'main-bg': 'rgb(var(--bg-primary-rgb) / <alpha-value>)',
        'main-text': 'rgb(var(--text-primary-rgb) / <alpha-value>)',
        'sec-text': 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
        'card-bg': 'rgb(var(--card-bg-rgb) / <alpha-value>)',
        'box-bg': 'rgb(var(--box-bg-rgb) / <alpha-value>)',
        'border-color': 'rgb(var(--border-color-rgb) / <alpha-value>)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
}
