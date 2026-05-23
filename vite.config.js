import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/trefle': {
        target: 'https://trefle.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trefle/, '/api/v1'),
      }
    }
  }
})