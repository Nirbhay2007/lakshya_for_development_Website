/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          bg: 'var(--admin-bg)',
          surface: 'var(--admin-surface)',
          'surface-2': 'var(--admin-surface-2)',
          border: 'var(--admin-border)',
          'border-hi': 'var(--admin-border-hi)',
          accent: 'var(--admin-accent)',
          'accent-hi': 'var(--admin-accent-hi)',
          amber: 'var(--admin-amber)',
          text: 'var(--admin-text)',
          muted: 'var(--admin-muted)',
          danger: 'var(--admin-danger)',
          success: 'var(--admin-success)',
        },
        forest: {
          50: '#f0faf0',
          100: '#dcf5dc',
          500: '#2e7d32',
          600: '#1b5e20',
          700: '#144d17',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
