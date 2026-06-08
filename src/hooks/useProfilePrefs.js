import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { loadProfilePrefs, profileToPrefs } from '../lib/profilePrefs'

/** Настройки садоводства: из профиля (БД) или localStorage. */
export function useProfilePrefs() {
  const profile = useAuthStore((s) => s.profile)
  const [prefs, setPrefs] = useState(() => profileToPrefs(profile))

  useEffect(() => {
    setPrefs(profileToPrefs(profile))
  }, [profile?.lunar_enabled, profile?.weather_alerts_enabled, profile?.id])

  useEffect(() => {
    const sync = () => setPrefs(loadProfilePrefs())
    window.addEventListener('storage', sync)
    window.addEventListener('pp-prefs-updated', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('pp-prefs-updated', sync)
    }
  }, [])

  return prefs
}
