import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
  resetOnboarding,
} from './onboardingStorage'

describe('onboardingStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {},
      getItem(key) {
        return this.store[key] ?? null
      },
      setItem(key, value) {
        this.store[key] = value
      },
      removeItem(key) {
        delete this.store[key]
      },
      clear() {
        this.store = {}
      },
    })
    localStorage.clear()
  })

  it('returns false until onboarding is marked complete', () => {
    expect(hasCompletedOnboarding('user-1')).toBe(false)
    markOnboardingCompleted('user-1')
    expect(hasCompletedOnboarding('user-1')).toBe(true)
  })

  it('reset allows onboarding to show again', () => {
    markOnboardingCompleted('user-1')
    resetOnboarding('user-1')
    expect(hasCompletedOnboarding('user-1')).toBe(false)
  })
})
