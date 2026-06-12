const STORAGE_PREFIX = 'appOnboardingCompleted'

function storageKey(userId) {
  return `${STORAGE_PREFIX}:${userId}`
}

export function hasCompletedOnboarding(userId) {
  if (!userId) return true
  try {
    return localStorage.getItem(storageKey(userId)) === '1'
  } catch {
    return true
  }
}

export function markOnboardingCompleted(userId) {
  if (!userId) return
  try {
    localStorage.setItem(storageKey(userId), '1')
  } catch {
    /* ignore quota errors */
  }
}

export function resetOnboarding(userId) {
  if (!userId) return
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    /* ignore */
  }
}
