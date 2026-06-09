import { supabase } from '../lib/supabase'

const CACHE_TTL_MS = 2 * 60 * 1000

const cache = {
  userId: null,
  loadedAt: 0,
  data: [],
  request: null,
}

export function invalidatePendingRemindersCache() {
  cache.loadedAt = 0
  cache.data = []
}

/** Общий кэш pending-напоминаний для главной и NotificationRunner. */
export async function fetchPendingReminders(userId, { force = false } = {}) {
  if (!userId) return []

  const now = Date.now()
  if (!force && cache.userId === userId && now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.data
  }
  if (!force && cache.request && cache.userId === userId) {
    return cache.request
  }

  cache.userId = userId
  cache.request = supabase
    .from('reminders')
    .select('id, title, due_date, status, type, created_at, plants:plant_id(name)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .then(({ data, error }) => {
      if (error) throw error
      cache.data = data || []
      cache.loadedAt = Date.now()
      return cache.data
    })
    .finally(() => {
      cache.request = null
    })

  try {
    return await cache.request
  } catch (err) {
    console.warn('Pending reminders fetch failed:', err)
    return cache.data
  }
}

export function pickTodayTasks(reminders, today, limit = 3) {
  return reminders
    .filter((r) => r.due_date === today)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, limit)
}
