export const PLANTING_METHOD_LABELS = {
  direct: 'Прямой посев',
  seedling: 'Рассада',
  perennial: 'Многолетник',
}

export function plantingMethodLabel(method) {
  return PLANTING_METHOD_LABELS[method] || PLANTING_METHOD_LABELS.direct
}

export const TASK_TYPE_LABELS = {
  watering: 'Полив',
  fertilizing: 'Подкормка',
  transplant: 'Пересадка',
  harvest: 'Сбор урожая',
  custom: 'Другое',
}

export const JOURNAL_ACTION_LABELS = {
  sowed: 'Посев',
  transplanted: 'Пересадка',
  custom: 'Запись',
  custom_plant_added: 'Запись в дневник',
  planted: 'Посадка на грядку',
  harvest: 'Сбор урожая',
  fertilized: 'Подкормка',
  watered: 'Полив',
  other: 'Событие',
}

/** Подпись действия журнала — без английских кодов в интерфейсе. */
export function journalActionLabel(action) {
  if (!action) return 'Запись'
  return JOURNAL_ACTION_LABELS[action] || 'Запись'
}

export const SUBMISSION_STATUS_FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'pending', label: 'Новые' },
  { key: 'in_review', label: 'В работе' },
  { key: 'approved', label: 'Одобрены' },
  { key: 'rejected', label: 'Отклонены' },
]

export const SUBMISSION_STATUS_META = {
  pending: { label: 'Новая', className: 'bg-amber-100 text-amber-800' },
  in_review: { label: 'В работе', className: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Одобрена', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Отклонена', className: 'bg-red-100 text-red-800' },
}

export function submissionStatusLabel(status) {
  return SUBMISSION_STATUS_META[status]?.label || status || '—'
}
