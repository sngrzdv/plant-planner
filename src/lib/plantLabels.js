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
}
