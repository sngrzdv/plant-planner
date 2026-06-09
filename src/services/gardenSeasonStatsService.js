import { supabase } from '../lib/supabase'
import { fetchUserBedIds } from './plantingService'
import { assembleSeasonReport } from '../lib/gardenStats'

/** Загрузка сырых данных и сбор сезонного отчёта для вкладки «Статистика». */
export async function fetchGardenSeasonStats(userId, seasonYear = new Date().getFullYear(), userName = '') {
  if (!userId) return null

  const year = Number(seasonYear) || new Date().getFullYear()
  const bedIds = await fetchUserBedIds(userId)

  const [
    layoutsResult,
    elementsResult,
    potsResult,
    journalResult,
    remindersResult,
    userPlantsResult,
  ] = await Promise.all([
    supabase.from('layouts').select('id, name, beds(id, name)').eq('user_id', userId),
    bedIds.length
      ? supabase
          .from('bed_elements')
          .select(`
            id, bed_id, plant_id, planted_year,
            beds(id, name, layout_id, layouts(id, name)),
            plants:plant_id(id, name)
          `)
          .in('bed_id', bedIds)
          .eq('type', 'plant_spot')
      : Promise.resolve({ data: [] }),
    supabase
      .from('pots')
      .select('id, custom_name, sowing_date, transplanted_date, status, plants:plant_id(name)')
      .eq('user_id', userId),
    supabase
      .from('garden_journal')
      .select('id, action, details, created_at, plants:plant_id(name), user_plants:user_plant_id(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('reminders')
      .select('id, title, type, due_date, status, completed_at')
      .eq('user_id', userId),
    supabase.from('user_plants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const layouts = layoutsResult.data || []
  const bedsCount = layouts.reduce((sum, layout) => sum + (layout.beds?.length || 0), 0)

  return assembleSeasonReport(
    {
      spots: elementsResult.data || [],
      journal: journalResult.data || [],
      pots: potsResult.data || [],
      reminders: remindersResult.data || [],
      gardensCount: layouts.length,
      bedsCount,
      userPlantsCount: userPlantsResult.count || 0,
    },
    year,
    userName,
  )
}

/** @deprecated Используйте fetchGardenSeasonStats — оставлено для совместимости. */
export async function fetchProfileStats(userId, seasonYear, userName) {
  return fetchGardenSeasonStats(userId, seasonYear, userName)
}
