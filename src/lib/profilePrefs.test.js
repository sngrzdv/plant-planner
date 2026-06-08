import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PROFILE_PREFS_DEFAULTS,
  profileToPrefs,
  prefsToDbColumns,
  loadProfilePrefs,
  saveProfilePrefs,
} from './profilePrefs'

function mockLocalStorage() {
  const store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  })
}

describe('profilePrefs', () => {
  beforeEach(() => {
    mockLocalStorage()
    localStorage.clear()
  })

  it('reads prefs from profile when columns exist', () => {
    const prefs = profileToPrefs({ lunar_enabled: false, weather_alerts_enabled: true })
    expect(prefs.lunarEnabled).toBe(false)
    expect(prefs.weatherAlerts).toBe(true)
  })

  it('falls back to localStorage without profile columns', () => {
    saveProfilePrefs({ lunarEnabled: false, weatherAlerts: false })
    expect(profileToPrefs(null)).toEqual({ lunarEnabled: false, weatherAlerts: false })
  })

  it('maps prefs to db columns', () => {
    expect(prefsToDbColumns({ lunarEnabled: true, weatherAlerts: false })).toEqual({
      lunar_enabled: true,
      weather_alerts_enabled: false,
    })
  })

  it('returns defaults when storage empty', () => {
    expect(loadProfilePrefs()).toEqual(PROFILE_PREFS_DEFAULTS)
  })
})
