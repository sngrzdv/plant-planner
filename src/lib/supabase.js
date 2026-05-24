import { createClient } from '@supabase/supabase-js'

// Берём ключи из файла .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_PROXY_URL || import.meta.env.VITE_SUPABASE_URL 
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Создаём подключение к Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)