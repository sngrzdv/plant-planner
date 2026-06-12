const ONBOARDING_KEY = 'appOnboardingCompleted'
const WELCOME_KEY = 'appWelcomeSeen'

function onboardingKey(userId) {
  return `${ONBOARDING_KEY}:${userId}`
}

function welcomeKey(userId) {
  return `${WELCOME_KEY}:${userId}`
}

export function hasCompletedOnboarding(userId) {
  if (!userId) return true
  try {
    return localStorage.getItem(onboardingKey(userId)) === '1'
  } catch {
    return true
  }
}

export function markOnboardingCompleted(userId) {
  if (!userId) return
  try {
    localStorage.setItem(onboardingKey(userId), '1')
  } catch {
    /* ignore quota errors */
  }
}

export function resetOnboarding(userId) {
  if (!userId) return
  try {
    localStorage.removeItem(onboardingKey(userId))
  } catch {
    /* ignore */
  }
}

/** Первый визит на главную — для текста «Добро пожаловать» (не сбрасывается при повторе подсказок). */
export function hasSeenWelcome(userId) {
  if (!userId) return true
  try {
    return localStorage.getItem(welcomeKey(userId)) === '1'
  } catch {
    return true
  }
}

export function markWelcomeSeen(userId) {
  if (!userId) return
  try {
    localStorage.setItem(welcomeKey(userId), '1')
  } catch {
    /* ignore */
  }
}
