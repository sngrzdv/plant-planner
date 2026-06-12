export function formatSupabaseError(error, sqlHintFile) {
  const message = error?.message || String(error || '')
  if (/relation.*does not exist|42P01/i.test(message)) {
    const hint = sqlHintFile
      ? ` Выполните SQL: ${sqlHintFile}`
      : ''
    return `Таблица не найдена в Supabase.${hint}`
  }
  if (/permission denied|42501/i.test(message)) {
    const hint = sqlHintFile ? ` Выполните SQL: ${sqlHintFile}` : ''
    return `Доступ запрещён (${message}).${hint}`
  }
  return message || 'Неизвестная ошибка'
}
