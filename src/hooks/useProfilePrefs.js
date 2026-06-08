import { useState, useEffect } from 'react'
import { loadProfilePrefs } from '../lib/profilePrefs'

/** Локальные настройки профиля с синхронизацией между вкладками. */
export function useProfilePrefs() {
  const [prefs, setPrefs] = useState(loadProfilePrefs)

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
