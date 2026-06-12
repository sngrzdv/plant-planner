/** Локальная дата YYYY-MM-DD без сдвига UTC. */
export function parseLocalDate(input) {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const value = input instanceof Date ? input : new Date(input)
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function formatLocalDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getTodayLocalDateString(referenceDate = new Date()) {
  return formatLocalDate(parseLocalDate(referenceDate))
}

/** Оставляет только задачи на сегодня и позже. */
export function filterRemindersFromToday(reminders, todayStr = getTodayLocalDateString()) {
  return reminders.filter((r) => r.due_date >= todayStr)
}

export function dedupeReminders(reminders) {
  const seen = new Set()
  return reminders.filter((r) => {
    const key = `${r.type}|${r.plant_id}|${r.due_date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function addDays(startDate, days) {
  const date = parseLocalDate(startDate)
  date.setDate(date.getDate() + days)
  return formatLocalDate(date)
}

export function buildWateringSchedule(plant, startDate) {
  const tasks = []
  const freq = plant.watering_freq_days || 3
  const totalDays = plant.maturation_days || 90
  const count = Math.floor(totalDays / freq)

  for (let i = 1; i <= count; i++) {
    tasks.push({
      type: 'watering',
      title: `Полив: ${plant.name}`,
      description: `Регулярный полив (раз в ${freq} дн.)`,
      plant_id: plant.id,
      due_date: addDays(startDate, i * freq),
      priority: 'normal',
      source: 'science',
    })
  }
  return tasks
}

export function buildFertilizingSchedule(plant, startDate) {
  const tasks = []
  const totalDays = plant.maturation_days || 90
  const count = Math.floor(totalDays / 14)

  for (let i = 1; i <= count; i++) {
    tasks.push({
      type: 'fertilizing',
      title: `Подкормка: ${plant.name}`,
      description: 'Внесение удобрений согласно графику',
      plant_id: plant.id,
      due_date: addDays(startDate, i * 14),
      priority: 'normal',
      source: 'science',
    })
  }
  return tasks
}

export function buildGerminationCheck(plant, startDate) {
  return [{
    type: 'transplant',
    title: `Проверить всходы: ${plant.name}`,
    description: 'Проверьте, появились ли первые ростки',
    plant_id: plant.id,
    due_date: addDays(startDate, 7),
    priority: 'high',
    source: 'science',
  }]
}

export function buildTransplantReminder(plant, startDate) {
  const daysToTransplant =
    plant.days_to_transplant || Math.round((plant.maturation_days || 60) * 0.6)
  return [{
    type: 'transplant',
    title: `Пора пересаживать: ${plant.name}`,
    description: 'Рассада готова к пересадке в открытый грунт',
    plant_id: plant.id,
    due_date: addDays(startDate, daysToTransplant),
    priority: 'high',
    source: 'science',
  }]
}

export function buildHarvestReminder(plant, startDate) {
  const totalDays = plant.maturation_days || 90
  return [{
    type: 'harvest',
    title: `Сбор урожая: ${plant.name}`,
    description: `Ожидаемая дата сбора урожая (${totalDays} дней)`,
    plant_id: plant.id,
    due_date: addDays(startDate, totalDays),
    priority: 'high',
    source: 'science',
  }]
}

export function buildRemindersForAction(plant, action, startDate) {
  const start = parseLocalDate(startDate)
  const reminders = []

  switch (action) {
    case 'sowed':
      reminders.push(
        ...buildWateringSchedule(plant, start),
        ...buildFertilizingSchedule(plant, start),
        ...buildGerminationCheck(plant, start),
        ...buildTransplantReminder(plant, start),
        ...buildHarvestReminder(plant, start),
      )
      break
    case 'transplanted':
    case 'planted':
      reminders.push(
        ...buildWateringSchedule(plant, start),
        ...buildFertilizingSchedule(plant, start),
        ...buildHarvestReminder(plant, start),
      )
      break
    default:
      break
  }

  return reminders
}
