import { createClient } from '@supabase/supabase-js'
import { getSupabaseAuthConfig } from './supabaseAuthConfig'

function resolveSupabaseUrl() {
  const directUrl = import.meta.env.VITE_SUPABASE_URL
  const proxyUrl = import.meta.env.VITE_SUPABASE_PROXY_URL

  // Прокси только если явно включён (VITE_SUPABASE_PROXY_URL=/supabase).
  // По умолчанию — прямое подключение к Supabase (быстрее локально и на prod).
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