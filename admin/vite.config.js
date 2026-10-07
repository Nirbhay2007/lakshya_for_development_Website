import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/admin',
  server: {
    port: 5174,
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
      }
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  }
})
