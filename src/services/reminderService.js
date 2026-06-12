import { supabase } from '../lib/supabase'
import { getMoonData } from '../utils/lunar'
import { invalidatePendingRemindersCache } from './pendingRemindersService'
import {
  buildRemindersForAction,
  dedupeReminders,
  filterRemindersFromToday,
  formatLocalDate,
  getTodayLocalDateString,
  parseLocalDate,
} from '../lib/reminderSchedule'

class ReminderService {
  async generateForPlant(userId, plant, action, startDate = new Date()) {
    if (!userId || !plant) return []

    const rawReminders = buildRemindersForAction(plant, action, startDate)
    const today = getTodayLocalDateString()
    const adjustedReminders = dedupeReminders(
      filterRemindersFromToday(
        rawReminders.map((r) => this.adjustByLunarCalendar(r)),
        today,
      ),
    )

    if (adjustedReminders.length === 0) return []

    const existingKeys = await this.fetchExistingScienceReminderKeys(
      userId,
      plant.id,
      adjustedReminders.map((r) => r.due_date),
    )
    const toInsert = adjustedReminders.filter(
      (r) => !existingKeys.has(`${r.type}|${r.due_date}`),
    )

    if (toInsert.length > 0) {
      const tasksWithUser = toInsert.map((r) => ({
        type: r.type,
        title: r.title,
        description: r.description || null,
        plant_id: r.plant_id || null,
        due_date: r.due_date,
        priority: r.priority || 'normal',
        source: r.source || 'science',
        user_id: userId,
        status: 'pending',
      }))

      await supabase.from('reminders').insert(tasksWithUser)
      invalidatePendingRemindersCache()
    }

    return toInsert
  }

  async fetchExistingScienceReminderKeys(userId, plantId, dueDates) {
    const uniqueDates = [...new Set(dueDates.filter(Boolean))]
    if (!uniqueDates.length) return new Set()

    const { data } = await supabase
      .from('reminders')
      .select('type, due_date')
      .eq('user_id', userId)
      .eq('plant_id', plantId)
      .eq('source', 'science')
      .eq('status', 'pending')
      .in('due_date', uniqueDates)

    return new Set((data || []).map((r) => `${r.type}|${r.due_date}`))
  }

  adjustByLunarCalendar(reminder) {
    const date = new Date(reminder.due_date)
    const moon = getMoonData(date)

    if (reminder.type === 'watering' && moon.type === 'full_moon') {
      date.setDate(date.getDate() + 1)
      return { ...reminder, due_date: date.toISOString().split('T')[0] }
    }

    if (reminder.type === 'transplant' && (moon.type === 'new_moon' || moon.type === 'full_moon')) {
      date.setDate(date.getDate() + 2)
      return { ...reminder, due_date: date.toISOString().split('T')[0] }
    }

    return reminder
  }

  async getUserReminders(userId, filters = {}) {
    let query = supabase
      .from('reminders')
      .select('*, plants:plant_id(id, name, image_url, watering_freq_days)')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.plantId) query = query.eq('plant_id', filters.plantId)
    if (filters.dateFrom) query = query.gte('due_date', filters.dateFrom)
    if (filters.dateTo) query = query.lte('due_date', filters.dateTo)

    const { data } = await query
    return data || []
  }

  async adjustByWeather(reminders, weatherData) {
    if (!weatherData) return reminders

    const isRainExpected =
      weatherData.description?.toLowerCase().includes('rain') ||
      weatherData.description?.toLowerCase().includes('дожд')

    if (!isRainExpected) return reminders

    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    return reminders.map((r) => {
      if (r.type === 'watering' && (r.due_date === today || r.due_date === tomorrowStr)) {
        return {
          ...r,
          description: `${r.description || ''} 🌧️ Возможен дождь — проверьте погоду`,
        }
      }
      return r
    })
  }

  async getTodayReminders(userId) {
    const today = getTodayLocalDateString()
    return this.getUserReminders(userId, { dateFrom: today, dateTo: today, status: 'pending' })
  }

  async getOverdueReminders(userId) {
    const yesterday = parseLocalDate(getTodayLocalDateString())
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = formatLocalDate(yesterday)
    return this.getUserReminders(userId, {
      dateTo: yesterdayStr,
      status: 'pending',
    })
  }

  async completeReminder(userId, reminderId) {
    if (!userId || !reminderId) {
      return { ok: false, error: new Error('Не удалось определить пользователя или задачу') }
    }

    const completedAt = new Date().toISOString()
    const columnMissing = (message) =>
      /completed_at|does not exist|column|schema cache/i.test(message || '')

    const runUpdate = (payload, selectColumns) =>
      supabase
        .from('reminders')
        .update(payload)
        .eq('id', reminderId)
        .eq('user_id', userId)
        .select(selectColumns)
        .maybeSingle()

    let { data, error } = await runUpdate(
      { status: 'completed', completed_at: completedAt },
      'id, status, completed_at',
    )

    if (error && columnMissing(error.message)) {
      ;({ data, error } = await runUpdate({ status: 'completed' }, 'id, status'))
      if (data) {
        data = { ...data, completed_at: completedAt }
      }
    }

    if (error) {
      return { ok: false, error }
    }

    if (!data) {
      return { ok: false, error: new Error('Задача не найдена или нет доступа') }
    }

    invalidatePendingRemindersCache()
    return { ok: true, data }
  }
}

export const reminderService = new ReminderService()
export default reminderService
