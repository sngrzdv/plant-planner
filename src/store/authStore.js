import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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
      isAdmin: profile?.role_id === 2
    })
  },
  
  signOut: async () => {
    await supabase.auth.signOut()
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

    const request = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          return null
        }
        if (data) {
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
  
  setLoading: (loading) => set({ loading })
}))