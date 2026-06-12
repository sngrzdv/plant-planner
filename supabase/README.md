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
