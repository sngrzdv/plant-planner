import { supabase } from '../lib/supabase'

const REMINDER_COLUMNS =
  'id, user_id, title, type, due_date, status, plant_id, source, created_at, completed_at'

const COMPLETED_LIMIT = 50

async function fetchCompletedReminders(userId) {
  let result = await supabase
    .from('reminders')
    .select(REMINDER_COLUMNS)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(COMPLETED_LIMIT)

  if (result.error && /completed_at|does not exist|column/i.test(result.error.message || '')) {
    result = await supabase
      .from('reminders')
      .select(REMINDER_COLUMNS.replace(', completed_at', ''))
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('due_date', { ascending: false })
      .limit(COMPLETED_LIMIT)
  }

  return result
}

/** Загрузка для доски: все pending + последние выполненные (не весь архив). */
export async function fetchBoardReminders(userId) {
  if (!userId) return { data: [], error: null }

  const [pendingResult, completedResult] = await Promise.all([
    supabase
      .from('reminders')
      .select(REMINDER_COLUMNS)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true }),
    fetchCompletedReminders(userId),
  ])

  const error = pendingResult.error || completedResult.error
  if (error) {
    return { data: null, error }
  }

  const pending = pendingResult.data || []
  const completed = completedResult.data || []
  return { data: [...pending, ...completed], error: null }
}

export function attachPlantsToReminders(reminders, plantsList) {
  const plantById = new Map((plantsList || []).map((plant) => [plant.id, plant]))
  return reminders.map((reminder) => ({
    ...reminder,
    plants: reminder.plant_id ? plantById.get(reminder.plant_id) || null : null,
  }))
}
