import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Khi có backend thật: đặt VITE_USE_MOCK=false và trỏ proxy tới BE
    proxy: {
      '/api': { target: process.env.API_URL ?? 'http://localhost:8000', changeOrigin: true },
    },
  },
})
