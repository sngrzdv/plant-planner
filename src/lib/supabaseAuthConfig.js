/** Один storageKey для прокси (localhost/supabase) и прямого URL — иначе сессия «теряется». */
export function getSupabaseProjectRef() {
  const url = import.meta.env.VITE_SUPABASE_URL || ''
  const match = url.match(/\/\/([^.]+)\.supabase\.co/)
  return match?.[1] || 'plant-planner'
}

export function getSupabaseAuthConfig() {
  return {
    storageKey: `sb-${getSupabaseProjectRef()}-auth-token`,
    detectSessionInUrl: false,
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
  }
}
