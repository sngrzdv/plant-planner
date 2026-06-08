const PREFS_KEY = 'pp_profile_prefs_v1'

const defaults = {
  lunarEnabled: true,
  weatherAlerts: true,
}

export function loadProfilePrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return { ...defaults }
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
