export function formatSupabaseError(error, sqlHintFile) {
  const message = error?.message || String(error || '')
  if (/relation.*does not exist|42P01/i.test(message)) {
    const hint = sqlHintFile
      ? ` Выполните SQL: ${sqlHintFile}`
      : ''
    return `Таблица не найдена в Supabase.${hint}`
  }
  if (/permission denied|42501/i.test(message)) {
    if (sqlHintFile === 'supabase/admin_catalog_rls.sql') {
      return `Доступ запрещён (${message}). Выполните supabase/fix_admin_category_insert.sql. Войдите как admin@gmail.com (role_id = 2), затем выйдите и войдите снова.`
    }
    const hint = sqlHintFile ? ` Выполните SQL: ${sqlHintFile}` : ''
    return `Доступ запрещён:${hint}`
  }
  return message || 'Неизвестная ошибка'
}
