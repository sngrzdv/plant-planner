/** Чистая логика сезонной статистики огорода (без Supabase). */

import { journalActionLabel } from './plantLabels'

const MONTHS = ['', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

export function parseYear(value, fallback = new Date().getFullYear()) {
  if (value == null || value === '') return fallback
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const fromDate = new Date(value)
  if (!Number.isNaN(fromDate.getTime())) return fromDate.getFullYear()
  const parsed = parseInt(String(value).slice(0, 4), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function isInSeasonYear(dateValue, seasonYear) {
  return parseYear(dateValue) === seasonYear
}

/** Нормализует посадку на грядке для агрегации. */
export function normalizePlantSpot(row) {
  const layout = row.beds?.layouts
  const bed = row.beds
  return {
    id: row.id,
    bedId: row.bed_id,
    bedName: bed?.name || 'Грядка',
    layoutId: layout?.id || bed?.layout_id,
    layoutName: layout?.name || 'Участок',
    plantId: row.plant_id,
    plantName: row.plants?.name || 'Без названия',
    plantedYear: parseYear(row.planted_year),
  }
}

export function groupSpotsByCulture(spots) {
  const map = new Map()
  for (const spot of spots) {
    const key = spot.plantId ?? spot.plantName
    if (!map.has(key)) {
      map.set(key, {
        plantId: spot.plantId,
        name: spot.plantName,
        total: 0,
        newThisSeason: 0,
        carriedOver: 0,
        gardens: new Set(),
      })
    }
    const item = map.get(key)
    item.total += 1
    item.gardens.add(spot.layoutName)
  }
  return map
}

export function buildCultureList(spots, seasonYear) {
  const map = groupSpotsByCulture(spots)
  for (const spot of spots) {
    const item = map.get(spot.plantId ?? spot.plantName)
    if (!item) continue
    if (spot.plantedYear === seasonYear) item.newThisSeason += 1
    else if (spot.plantedYear < seasonYear) item.carriedOver += 1
  }
  return [...map.values()]
    .map((c) => ({ ...c, gardens: [...c.gardens].sort() }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ru'))
}

export function buildGardenBreakdown(spots, seasonYear) {
  const map = new Map()
  for (const spot of spots) {
    const key = spot.layoutId || spot.layoutName
    if (!map.has(key)) {
      map.set(key, {
        id: spot.layoutId,
        name: spot.layoutName,
        beds: new Set(),
        spotsTotal: 0,
        newThisSeason: 0,
        carriedOver: 0,
        cultures: new Map(),
      })
    }
    const garden = map.get(key)
    garden.beds.add(spot.bedId)
    garden.spotsTotal += 1
    if (spot.plantedYear === seasonYear) garden.newThisSeason += 1
    else if (spot.plantedYear < seasonYear) garden.carriedOver += 1

    const cultureKey = spot.plantId ?? spot.plantName
    garden.cultures.set(cultureKey, (garden.cultures.get(cultureKey) || 0) + 1)
  }

  return [...map.values()]
    .map((g) => ({
      id: g.id,
      name: g.name,
      bedsCount: g.beds.size,
      spotsTotal: g.spotsTotal,
      newThisSeason: g.newThisSeason,
      carriedOver: g.carriedOver,
      topCultures: [...g.cultures.entries()]
        .map(([key, count]) => {
          const spot = spots.find((s) => (s.plantId ?? s.plantName) === key)
          return { name: spot?.plantName || String(key), count }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function groupJournalByAction(entries) {
  const map = new Map()
  for (const entry of entries || []) {
    const action = entry.action || 'other'
    map.set(action, (map.get(action) || 0) + 1)
  }
  return [...map.entries()]
    .map(([action, count]) => ({
      action,
      label: journalActionLabel(action),
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

export function groupJournalByYear(entries) {
  const byYear = {}
  for (const entry of entries || []) {
    const year = parseYear(entry.created_at)
    if (!byYear[year]) byYear[year] = { year, count: 0, labels: [] }
    byYear[year].count += 1
    const label = entry.details || entry.plants?.name || entry.user_plants?.name
    if (label) byYear[year].labels.push(label)
  }
  return Object.values(byYear).sort((a, b) => b.year - a.year)
}

export function groupCompletedTasksByMonth(entries, seasonYear) {
  const byMonth = {}
  for (const row of entries || []) {
    const timestamp = row.completed_at || row.due_date
    if (!timestamp) continue
    if (parseYear(timestamp) !== seasonYear && String(timestamp).slice(0, 4) !== String(seasonYear)) {
      const monthKey = timestamp.substring(0, 7)
      if (!monthKey.startsWith(String(seasonYear))) continue
    }
    const month = timestamp.substring(0, 7)
    if (!month.startsWith(String(seasonYear))) continue
    byMonth[month] = (byMonth[month] || 0) + 1
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, completed]) => ({
      month,
      monthLabel: MONTHS[parseInt(month.split('-')[1], 10)] || month,
      completed,
    }))
}

export function collectAvailableYears({ spots = [], journal = [], pots = [], reminders = [] }) {
  const years = new Set([new Date().getFullYear()])
  for (const s of spots) years.add(s.plantedYear)
  for (const j of journal) years.add(parseYear(j.created_at))
  for (const p of pots) {
    years.add(parseYear(p.sowing_date))
    if (p.transplanted_date) years.add(parseYear(p.transplanted_date))
  }
  for (const r of reminders) years.add(parseYear(r.due_date))
  return [...years].sort((a, b) => b - a)
}

export function buildSeasonOverview({
  seasonYear,
  spots,
  potsSowed,
  potsTransplanted,
  journalSeason,
  tasksCompleted,
  tasksPending,
  tasksOverdue,
  gardensCount,
  bedsCount,
}) {
  const newPlantings = spots.filter((s) => s.plantedYear === seasonYear).length
  const carriedOver = spots.filter((s) => s.plantedYear < seasonYear).length
  const cultureIds = new Set(spots.map((s) => s.plantId).filter(Boolean))
  const totalClosed = tasksCompleted + tasksPending
  const completionRate = totalClosed > 0 ? Math.round((tasksCompleted / totalClosed) * 100) : 0

  return {
    seasonYear,
    gardensCount,
    bedsCount,
    totalSpots: spots.length,
    newPlantingsThisSeason: newPlantings,
    carriedOverPlantings: carriedOver,
    uniqueCultures: cultureIds.size,
    seedlingsSowed: potsSowed.length,
    seedlingsTransplanted: potsTransplanted.length,
    journalEvents: journalSeason.length,
    tasksCompleted,
    tasksPending,
    tasksOverdue,
    completionRate,
  }
}

export function buildYearComparison(seasonYear, current, previous) {
  if (!previous) return null
  const delta = (key) => (current[key] ?? 0) - (previous[key] ?? 0)
  return {
    previousYear: seasonYear - 1,
    current,
    previous,
    delta: {
      totalSpots: delta('totalSpots'),
      newPlantings: delta('newPlantings'),
      journalEvents: delta('journalEvents'),
      tasksCompleted: delta('tasksCompleted'),
      uniqueCultures: delta('uniqueCultures'),
    },
  }
}

export function buildSeasonRecommendations(overview, cultures) {
  const tips = []
  if (overview.gardensCount === 0) {
    tips.push('Создайте участок и спланируйте грядки — статистика сезона начнёт собираться автоматически.')
  }
  if (overview.totalSpots === 0 && overview.seedlingsSowed === 0) {
    tips.push('Отметьте посадки на схеме грядки или добавьте рассаду — так видно, что выращиваете в этом сезоне.')
  }
  if (overview.carriedOverPlantings > 0) {
    tips.push(
      `${overview.carriedOverPlantings} ${pluralRu(overview.carriedOverPlantings, 'посадка', 'посадки', 'посадок')} с прошлых сезонов — проверьте, что многолетники и деревья актуальны.`,
    )
  }
  if (overview.newPlantingsThisSeason > 0) {
    tips.push(`В ${overview.seasonYear} году посажено ${overview.newPlantingsThisSeason} ${pluralRu(overview.newPlantingsThisSeason, 'культура', 'культуры', 'культур')} (новые посадки).`)
  }
  if (overview.tasksOverdue > 0) {
    tips.push(`${overview.tasksOverdue} просроченных задач — завершите уход, чтобы сезон не сорвался.`)
  }
  if (overview.completionRate >= 80 && overview.tasksCompleted > 0) {
    tips.push(`Дисциплина ухода: ${overview.completionRate}% задач сезона выполнено.`)
  }
  if (cultures.length > 0) {
    tips.push(`Основная культура сезона: ${cultures[0].name} (${cultures[0].total} ${pluralRu(cultures[0].total, 'посадка', 'посадки', 'посадок')}).`)
  }
  if (tips.length === 0) tips.push('Продолжайте отмечать посадки и события — отчёт станет точнее с каждым сезоном.')
  return tips
}

function pluralRu(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

export function formatJournalEntry(entry) {
  const date = new Date(entry.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const action = journalActionLabel(entry.action)
  const title = entry.details || entry.plants?.name || entry.user_plants?.name || 'Запись'
  return { id: entry.id, date, action, title }
}

export function assembleSeasonReport(raw, seasonYear, userName = '') {
  const spots = (raw.spots || []).map(normalizePlantSpot)
  const journalSeason = (raw.journal || []).filter((e) => isInSeasonYear(e.created_at, seasonYear))
  const potsSowed = (raw.pots || []).filter((p) => isInSeasonYear(p.sowing_date, seasonYear))
  const potsTransplanted = (raw.pots || []).filter(
    (p) => p.status === 'transplanted' && isInSeasonYear(p.transplanted_date || p.sowing_date, seasonYear),
  )
  const remindersSeason = (raw.reminders || []).filter((r) => {
    const y = String(r.due_date || '').slice(0, 4)
    return y === String(seasonYear)
  })
  const tasksCompleted = remindersSeason.filter((r) => r.status === 'completed').length
  const tasksPending = remindersSeason.filter((r) => r.status === 'pending').length
  const today = new Date().toISOString().split('T')[0]
  const tasksOverdue = remindersSeason.filter((r) => r.status === 'pending' && r.due_date < today).length

  const cultures = buildCultureList(spots, seasonYear)
  const gardens = buildGardenBreakdown(spots, seasonYear)
  const overview = buildSeasonOverview({
    seasonYear,
    spots,
    potsSowed,
    potsTransplanted,
    journalSeason,
    tasksCompleted,
    tasksPending,
    tasksOverdue,
    gardensCount: raw.gardensCount || gardens.length,
    bedsCount: raw.bedsCount ?? new Set(spots.map((s) => s.bedId)).size,
  })

  const prevYear = seasonYear - 1
  const prevSpots = spots.filter((s) => s.plantedYear === prevYear)
  const prevJournal = (raw.journal || []).filter((e) => isInSeasonYear(e.created_at, prevYear))
  const prevReminders = (raw.reminders || []).filter((r) => String(r.due_date || '').slice(0, 4) === String(prevYear))
  const yearComparison = buildYearComparison(seasonYear, {
    totalSpots: spots.filter((s) => s.plantedYear <= seasonYear).length,
    newPlantings: overview.newPlantingsThisSeason,
    journalEvents: journalSeason.length,
    tasksCompleted,
    uniqueCultures: overview.uniqueCultures,
  }, prevJournal.length || prevSpots.length ? {
    totalSpots: prevSpots.length,
    newPlantings: prevSpots.length,
    journalEvents: prevJournal.length,
    tasksCompleted: prevReminders.filter((r) => r.status === 'completed').length,
    uniqueCultures: new Set(prevSpots.map((s) => s.plantId)).size,
  } : null)

  return {
    seasonYear,
    userName,
    generatedAt: new Date().toISOString(),
    overview,
    gardens,
    cultures,
    journalByAction: groupJournalByAction(journalSeason),
    journalRecent: journalSeason.slice(0, 12).map(formatJournalEntry),
    yearlyJournal: groupJournalByYear(raw.journal || []),
    monthlyTasks: groupCompletedTasksByMonth(
      remindersSeason.filter((r) => r.status === 'completed'),
      seasonYear,
    ),
    potsSowed: potsSowed.map((p) => ({
      id: p.id,
      name: p.custom_name || p.plants?.name || 'Рассада',
      sowingDate: p.sowing_date,
      status: p.status,
    })),
    potsTransplanted: potsTransplanted.map((p) => ({
      id: p.id,
      name: p.custom_name || p.plants?.name || 'Рассада',
      transplantedDate: p.transplanted_date,
    })),
    yearComparison,
    availableYears: collectAvailableYears({
      spots,
      journal: raw.journal,
      pots: raw.pots,
      reminders: raw.reminders,
    }),
    recommendations: buildSeasonRecommendations(overview, cultures),
    userPlantsCount: raw.userPlantsCount || 0,
  }
}
