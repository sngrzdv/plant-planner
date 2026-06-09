import { supabase } from '../lib/supabase'
import { fetchUserBedIds } from './plantingService'

const ACTION_LABELS = {
  sowed: 'Посев',
  transplanted: 'Пересадка',
  custom_plant_added: 'В дневник',
}

const MONTHS = ['', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

function groupJournalByYear(entries) {
  const byYear = {}
  for (const entry of entries) {
    const year = new Date(entry.created_at).getFullYear()
    if (!byYear[year]) byYear[year] = { year, count: 0, labels: [] }
    byYear[year].count++
    const label = entry.details || entry.plants?.name || entry.user_plants?.name
    if (label) byYear[year].labels.push(label)
  }
  return Object.values(byYear).sort((a, b) => b.year - a.year)
}

function groupCompletedByMonth(entries) {
  const byMonth = {}
  for (const row of entries) {
    const timestamp = row.completed_at || row.due_date
    if (!timestamp) continue
    const month = timestamp.substring(0, 7)
    byMonth[month] = (byMonth[month] || 0) + 1
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, completed]) => ({
      month,
      monthLabel: MONTHS[parseInt(month.split('-')[1], 10)] || month,
      completed,
    }))
}

function topCulturesFromSpots(elements) {
  const counts = {}
  for (const row of elements || []) {
    const name = row.plants?.name || 'Неизвестно'
    counts[name] = (counts[name] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
}

function uniquePlantIds(elements, userPlantsCount) {
  const ids = new Set((elements || []).map((e) => e.plant_id).filter(Boolean))
  return ids.size + (userPlantsCount || 0)
}

function formatJournalEntry(entry) {
  const date = new Date(entry.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const action = ACTION_LABELS[entry.action] || entry.action || 'Событие'
  const title = entry.details || entry.plants?.name || entry.user_plants?.name || 'Запись'
  return { id: entry.id, date, action, title }
}

function buildRecommendations(summary) {
  const tips = []
  if (summary.overdueTasks > 0) {
    tips.push(`${summary.overdueTasks} просроченных задач — загляните в календарь ухода.`)
  }
  if (summary.todayTasks > 0) {
    tips.push(`Сегодня ${summary.todayTasks} ${summary.todayTasks === 1 ? 'задача' : 'задач'}.`)
  }
  if (summary.gardens === 0) tips.push('Создайте первый участок в разделе «Мои участки».')
  if (summary.plantSpots === 0 && summary.potsGrowing === 0) {
    tips.push('Посадите рассаду или отметьте посадку на грядке.')
  }
  if (summary.completionRate >= 80 && summary.completedTasks > 0) {
    tips.push(`Отличная дисциплина: ${summary.completionRate}% задач выполнено.`)
  }
  if (summary.topPlants.length > 0) {
    tips.push(`Чаще всего выращиваете: ${summary.topPlants[0][0]}.`)
  }
  if (tips.length === 0) tips.push('✨ Продолжайте в том же духе — сад развивается!')
  return tips
}

/** Сводная статистика для вкладки «Статистика» в профиле. */
export async function fetchProfileStats(userId) {
  if (!userId) return null

  const today = new Date().toISOString().split('T')[0]
  const bedIds = await fetchUserBedIds(userId)

  const [
    { count: gardens },
    { count: potsGrowing },
    { count: potsTransplanted },
    { count: userPlantsCount },
    { count: pendingTasks },
    { count: completedTasks },
    { count: overdueTasks },
    { count: todayTasks },
    { data: journalEntries },
    { data: completedReminders },
    elementsResult,
  ] = await Promise.all([
    supabase.from('layouts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('pots').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'growing'),
    supabase.from('pots').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'transplanted'),
    supabase.from('user_plants').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending'),
    supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
    supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lt('due_date', today),
    supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('due_date', today),
    supabase
      .from('garden_journal')
      .select('id, action, details, created_at, plants:plant_id(name), user_plants:user_plant_id(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('reminders')
      .select('due_date')
      .eq('user_id', userId)
      .eq('status', 'completed'),
    bedIds.length
      ? supabase
          .from('bed_elements')
          .select('plant_id, planted_year, plants:plant_id(name)')
          .in('bed_id', bedIds)
          .eq('type', 'plant_spot')
      : Promise.resolve({ data: [] }),
  ])

  const elements = elementsResult?.data || []
  const plantSpots = elements.length
  const topPlants = topCulturesFromSpots(elements)
  const uniqueCultures = uniquePlantIds(elements, userPlantsCount)

  const totalClosed = (completedTasks || 0) + (pendingTasks || 0)
  const completionRate = totalClosed > 0
    ? Math.round(((completedTasks || 0) / totalClosed) * 100)
    : 0

  const summary = {
    gardens: gardens || 0,
    plantSpots,
    uniqueCultures,
    potsGrowing: potsGrowing || 0,
    potsTransplanted: potsTransplanted || 0,
    userPlantsCount: userPlantsCount || 0,
    pendingTasks: pendingTasks || 0,
    completedTasks: completedTasks || 0,
    overdueTasks: overdueTasks || 0,
    todayTasks: todayTasks || 0,
    completionRate,
    topPlants,
  }

  return {
    summary,
    yearlyStats: groupJournalByYear(journalEntries || []),
    recentJournal: (journalEntries || []).slice(0, 8).map(formatJournalEntry),
    monthlyCompleted: groupCompletedByMonth(completedReminders || []),
    recommendations: buildRecommendations(summary),
  }
}

export { ACTION_LABELS }
