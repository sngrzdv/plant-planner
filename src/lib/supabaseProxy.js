/** Общая логика прокси Supabase через same-origin (/supabase → Vercel rewrite). */

const PROXY_PATH = '/supabase'

export function getSupabaseProxyPath() {
  const override = import.meta.env.VITE_SUPABASE_PROXY_URL
  if (override && override !== 'off' && override !== 'false' && override !== 'auto') {
    return override.startsWith('/') ? override : `/${override}`
  }
  return PROXY_PATH
}

/**
 * На production — proxy через домен Vercel (работает в РФ без VPN).
 * Локально — прямое подключение (быстрее dev-сервера).
 * VITE_SUPABASE_PROXY_URL=off — всегда напрямую.
 * VITE_SUPABASE_PROXY_URL=/supabase — proxy и локально.
 */
export function shouldUseSupabaseProxy() {
  const override = import.meta.env.VITE_SUPABASE_PROXY_URL
  if (override === 'off' || override === 'false') return false
  if (override && override !== 'auto') return true
  return import.meta.env.PROD
}

export function resolveSupabasePublicUrl(pathWithLeadingSlash) {
  const path = pathWithLeadingSlash.startsWith('/')
    ? pathWithLeadingSlash
    : `/${pathWithLeadingSlash}`

  if (shouldUseSupabaseProxy() && typeof window !== 'undefined') {
    return `${window.location.origin}${getSupabaseProxyPath()}${path}`
  }

  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  return base ? `${base}${path}` : path
}

export function resolveSupabaseClientUrl() {
  if (shouldUseSupabaseProxy() && typeof window !== 'undefined') {
    return `${window.location.origin}${getSupabaseProxyPath()}`
  }
  return import.meta.env.VITE_SUPABASE_URL
}
