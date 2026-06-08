const PREFS_KEY = 'pp_profile_prefs_v1'

export const PROFILE_PREFS_DEFAULTS = {
  lunarEnabled: true,
  weatherAlerts: true,
}

/** Настройки садоводства из профиля (БД) с fallback на localStorage. */
export function profileToPrefs(profile) {
  if (profile?.lunar_enabled != null || profile?.weather_alerts_enabled != null) {
    return {
      lunarEnabled: profile.lunar_enabled ?? PROFILE_PREFS_DEFAULTS.lunarEnabled,
      weatherAlerts: profile.weather_alerts_enabled ?? PROFILE_PREFS_DEFAULTS.weatherAlerts,
    }
  }
  return loadProfilePrefs()
}

export function loadProfilePrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...PROFILE_PREFS_DEFAULTS }
    return { ...PROFILE_PREFS_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...PROFILE_PREFS_DEFAULTS }
  }
}

export function saveProfilePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    window.dispatchEvent(new Event('pp-prefs-updated'))
  } catch {
    // ignore quota errors
  }
}

export function prefsToDbColumns(prefs) {
  return {
    lunar_enabled: prefs.lunarEnabled,
    weather_alerts_enabled: prefs.weatherAlerts,
  }
}
