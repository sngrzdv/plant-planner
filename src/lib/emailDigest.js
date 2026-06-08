/** Текст дайджеста задач для mailto и email. */
export function buildDigestLines({ overdue = [], today = [] }) {
  const lines = ['Plant Planner — напоминание о задачах', '']
  if (overdue.length) {
    lines.push(`Просрочено (${overdue.length}):`)
    overdue.slice(0, 10).forEach((t) => lines.push(`  • ${t.title}${t.due_date ? ` (${t.due_date})` : ''}`))
    lines.push('')
  }
  if (today.length) {
    lines.push(`На сегодня (${today.length}):`)
    today.slice(0, 10).forEach((t) => lines.push(`  • ${t.title}`))
    lines.push('')
  }
  if (!overdue.length && !today.length) {
    lines.push('На сегодня задач нет. Отличная работа!')
  }
  lines.push('', 'Открыть приложение: https://plant-planner-nu.vercel.app/reminders')
  return lines
}

export function buildDigestSubject({ overdue = [], today = [] }) {
  if (overdue.length) return `Plant Planner: ${overdue.length} просроченных задач`
  if (today.length) return `Plant Planner: ${today.length} задач на сегодня`
  return 'Plant Planner: задачи в порядке'
}

/** Ссылка mailto с дайджестом задач (работает без серверной отправки). */
export function buildTaskDigestMailto(email, { overdue = [], today = [] }) {
  if (!email) return null
  const lines = buildDigestLines({ overdue, today })
  const subject = buildDigestSubject({ overdue, today })
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}
