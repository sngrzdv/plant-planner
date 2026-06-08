import { createClient } from '@supabase/supabase-js'
import { getSupabaseAuthConfig } from './supabaseAuthConfig'

function resolveSupabaseUrl() {
  const proxyUrl = import.meta.env.VITE_SUPABASE_PROXY_URL || '/supabase'
  if (proxyUrl) {
    return proxyUrl.startsWith('/')
      ? `${window.location.origin}${proxyUrl}`
      : proxyUrl
  }
  return import.meta.env.VITE_SUPABASE_URL
}

const supabaseUrl = resolveSupabaseUrl()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Создаём подключение к Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: getSupabaseAuthConfig(),
})