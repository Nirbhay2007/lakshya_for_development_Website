import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [
        '.',
        '../shared'
      ]
    },
    proxy: {
      '/api': {
        target: process.env.SERVER_URL || 'http://localhost:3000',
        changeOrigin: true
      },
      '/admin': {
        target: process.env.ADMIN_URL || 'http://localhost:5174',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
