import { createClient } from '@supabase/supabase-js'
import { getSupabaseAuthConfig } from './supabaseAuthConfig'
import { resolveSupabaseClientUrl } from './supabaseProxy'

const supabaseUrl = resolveSupabaseClientUrl()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: getSupabaseAuthConfig(),
})
