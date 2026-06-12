import { describe, it, expect } from 'vitest'
import {
  buildRemindersForAction,
  filterRemindersFromToday,
  dedupeReminders,
  getTodayLocalDateString,
} from './reminderSchedule'

const basil = {
  id: 1,
  name: 'Базилик',
  watering_freq_days: 3,
  maturation_days: 60,
  days_to_transplant: 45,
}

describe('reminderSchedule', () => {
  it('не создаёт задачи на даты до сегодня при прошлой дате посева', () => {
    const today = getTodayLocalDateString(new Date('2026-05-31'))
    const sowDate = '2026-05-01'
    const raw = buildRemindersForAction(basil, 'sowed', sowDate)
    const future = filterRemindersFromToday(raw, today)

    expect(raw.some((r) => r.due_date === '2026-05-04')).toBe(true)
    expect(future.every((r) => r.due_date >= today)).toBe(true)
    expect(future.some((r) => r.due_date === '2026-05-04')).toBe(false)
    expect(future.some((r) => r.type === 'harvest')).toBe(true)
  })

  it('оставляет все задачи, если дата посева — сегодня', () => {
    const today = getTodayLocalDateString(new Date('2026-05-31'))
    const raw = buildRemindersForAction(basil, 'sowed', today)
    const future = filterRemindersFromToday(raw, today)

    expect(future.length).toBe(raw.length)
    expect(future.length).toBeGreaterThan(0)
  })

  it('убирает дубликаты в одной партии', () => {
    const task = {
      type: 'watering',
      plant_id: 1,
      due_date: '2026-06-01',
      title: 'Полив',
    }
    const result = dedupeReminders([task, task, { ...task, title: 'Другой' }])
    expect(result).toHaveLength(1)
  })
})
