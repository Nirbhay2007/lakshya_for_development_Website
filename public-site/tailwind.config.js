/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: 'var(--color-primary-lightest, #f0faf0)',
          100: 'var(--color-primary-light, #dcf5dc)',
          500: 'var(--color-primary, #2e7d32)',
          600: 'var(--color-primary-dark, #1b5e20)',
          700: 'var(--color-primary-darker, #144d17)',
        },
        earth: {
          400: '#a1887f',
          500: '#795548',
          600: '#5d4037',
        },
        amber: {
          400: 'var(--color-accent-light, #ffca28)',
          500: 'var(--color-accent, #f57c00)',
          600: 'var(--color-accent-dark, #e65100)',
        },
        cream: '#f5eedc',
        charcoal: '#1a1a1a',
        mist: '#ede6d3',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
