/** Публичный URL приложения (для ссылок в письмах Supabase). */
export function getSiteUrl() {
  const fromEnv = import.meta.env.VITE_SITE_URL
  if (fromEnv && typeof fromEnv === 'string') {
    return fromEnv.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'https://plant-planner-nu.vercel.app'
}

export function getResetPasswordUrl() {
  return `${getSiteUrl()}/reset-password`
}
