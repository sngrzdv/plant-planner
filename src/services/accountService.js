import { supabase } from '../lib/supabase'

/**
 * Удаление своего аккаунта (auth.users + каскад данных).
 * Требует функцию delete_own_account() в Supabase.
 */
export async function deleteOwnAccount() {
  const { error } = await supabase.rpc('delete_own_account')
  if (error) throw error
}
