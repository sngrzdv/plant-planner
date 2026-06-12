# База данных «Мой огород»

## Полный скрипт

**Файл:** [`complete_database.sql`](./complete_database.sql)

Содержит всё для **нового** проекта Supabase:

- 19 таблиц в `public`
- индексы, функции, триггеры
- Row Level Security (RLS)
- Storage: `garden-photos`, `plant-images`, `avatars`
- начальные категории растений

### Установка

1. [supabase.com](https://supabase.com) → новый проект
2. **SQL Editor** → вставить `complete_database.sql` → **Run**
3. **Authentication → Providers** → Email
4. В `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
5. Зарегистрироваться в приложении
6. Назначить админа:

```sql
update public.profiles set role_id = 2 where email = 'ваш@email.com';
```

### Проверка

```sql
select tablename from pg_tables where schemaname = 'public' order by tablename;
select email, role_id, public.is_admin(id) from public.profiles;
```

## Схема связей

```
auth.users → profiles
profiles → layouts → beds → bed_elements, plants_on_beds
profiles → pots, reminders, garden_journal, user_plants, plant_submissions, plant_favorites
plant_categories → plants
```

## Edge Function (опционально)

Email-дайджест: `functions/send-email-digest/`

## Дополнительные миграции (существующий проект)

Если база уже развёрнута из старой версии `complete_database.sql`, выполните по необходимости:

| Файл | Зачем |
|---|---|
| [`delete_own_account.sql`](./delete_own_account.sql) | **Удаление аккаунта** в профиле (без этого — ошибка «не настроена на сервере») |
| [`user_plants_extensions.sql`](./user_plants_extensions.sql) | Посадка растений из личного дневника |
| [`user_plants_published.sql`](./user_plants_published.sql) | Метка «Опубликовано» после одобрения заявки |
| [`pots_journal_fk.sql`](./pots_journal_fk.sql) | Удаление рассады без ошибки FK журнала |

После каждого скрипта в SQL Editor нажмите **Run**. Функция `delete_own_account` подхватится сразу (в скрипте есть `notify pgrst, 'reload schema'`).
