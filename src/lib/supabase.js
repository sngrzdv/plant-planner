import { createClient } from '@supabase/supabase-js'
import { getSupabaseAuthConfig } from './supabaseAuthConfig'

function resolveSupabaseUrl() {
  const directUrl = import.meta.env.VITE_SUPABASE_URL

  // На production — напрямую в Supabase (без лишнего hop через Vercel /supabase).
  if (import.meta.env.PROD && directUrl) {
    return directUrl
  }

  const proxyUrl = import.meta.env.VITE_SUPABASE_PROXY_URL ?? '/supabase'
  if (proxyUrl && proxyUrl !== 'off' && proxyUrl !== 'false') {
    return proxyUrl.startsWith('/')
      ? `${window.location.origin}${proxyUrl}`
      : proxyUrl
  }

  return directUrl
}

const supabaseUrl = resolveSupabaseUrl()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Создаём подключение к Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: getSupabaseAuthConfig(),
})