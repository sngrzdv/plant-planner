import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const PROFILE_CACHE_KEY = 'pp_profile_v2'

function sanitizeCachedProfile(profile) {
  if (!profile) return null
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    city: profile.city,
    role_id: profile.role_id,
    is_blocked: profile.is_blocked,
    notification_enabled: profile.notification_enabled,
    email_notifications_enabled: profile.email_notifications_enabled,
    lunar_enabled: profile.lunar_enabled,
    weather_alerts_enabled: profile.weather_alerts_enabled,
    last_email_digest_sent_at: profile.last_email_digest_sent_at,
    avatar_url: profile.avatar_url,
    created_at: profile.created_at,
  }
}

function readProfileCache(userId) {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.id !== userId || !parsed?.data) return null
    return sanitizeCachedProfile(parsed.data)
  } catch {
    return null
  }
}

function writeProfileCache(userId, data) {
  try {
    sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ id: userId, data: sanitizeCachedProfile(data) }))
  } catch {
    // ignore quota errors
  }
}

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  profileRequest: null,

  setUser: (user) => set({ user }),

  setProfile: (profile) => {
    set({
      profile,
      isAdmin: profile?.role_id === 2 && !profile?.is_blocked,
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    try {
      sessionStorage.removeItem(PROFILE_CACHE_KEY)
    } catch {
      // ignore
    }
    set({ user: null, profile: null, isAdmin: false })
  },

  loadProfile: async (userId, { force = false } = {}) => {
    const { profile, profileRequest } = get()
    if (!force && profile?.id === userId) {
      return profile
    }
    if (!force && profileRequest) {
      return profileRequest
    }

    if (!force) {
      const cached = readProfileCache(userId)
      if (cached) {
        get().setProfile(cached)
      }
    }

    const request = supabase
      .from('profiles')
      .select('id, email, full_name, city, role_id, is_blocked, notification_enabled, email_notifications_enabled, lunar_enabled, weather_alerts_enabled, last_email_digest_sent_at, avatar_url, created_at')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          return get().profile
        }
        if (data) {
          writeProfileCache(userId, data)
          get().setProfile(data)
        }
        return data
      })
      .finally(() => {
        set({ profileRequest: null })
      })

    set({ profileRequest: request })
    return request
  },

  setLoading: (loading) => set({ loading }),
}))
