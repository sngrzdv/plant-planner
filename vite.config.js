import { defineConfig, loadEnv } from 'vite'
import { cwd } from 'node:process'
import dns from 'node:dns'

dns.setDefaultResultOrder('ipv4first')
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/supabase': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase/, ''),
          timeout: 120_000,
          proxyTimeout: 120_000,
        },
      },
    },
  }
})