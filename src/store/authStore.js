import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  
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
  
  loadProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    console.log('Загружен профиль:', data)
    console.log('Ошибка загрузки:', error)
    
    if (!error && data) {
      get().setProfile(data)
    }
    return data
  },
  
  setLoading: (loading) => set({ loading })
}))