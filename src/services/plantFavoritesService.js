import { supabase } from '../lib/supabase'

export async function fetchFavoritePlantIds(userId) {
  if (!userId) return new Set()
  const { data, error } = await supabase
    .from('plant_favorites')
    .select('plant_id')
    .eq('user_id', userId)
  if (error) throw error
  return new Set((data || []).map((row) => row.plant_id))
}

export async function togglePlantFavorite(userId, plantId) {
  if (!userId || !plantId) throw new Error('Не указан пользователь или растение')

  const { data: existing } = await supabase
    .from('plant_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('plant_id', plantId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('plant_favorites').delete().eq('id', existing.id)
    if (error) throw error
    return false
  }

  const { error } = await supabase.from('plant_favorites').insert({
    user_id: userId,
    plant_id: plantId,
  })
  if (error) throw error
  return true
}
