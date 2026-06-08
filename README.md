# Plant Planner

Веб-приложение для планирования сада: участки, грядки, рассада, каталог растений, напоминания и лунный календарь.

**Production:** https://plant-planner-nu.vercel.app

## Быстрый старт

```bash
npm install
cp .env.example .env   # заполните переменные
npm run dev
```

## Переменные окружения

| Переменная | Обязательно | Описание |
|---|---|---|
| `VITE_SUPABASE_URL` | да | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | да | Anon key Supabase |
| `VITE_OPENWEATHER_API_KEY` | нет | Погода на главной ([OpenWeatherMap](https://openweathermap.org/api)) |

На **Vercel** добавьте те же переменные в Settings → Environment Variables.

> Если `.env` раньше попадал в Git — ротируйте ключи Supabase в дашборде.

## SQL-миграции (Supabase → SQL Editor)

Выполните по порядку при первом развёртывании:

1. `supabase/full_schema.sql` — базовая схема (если проект пустой)
2. `supabase/fix_storage_upload.sql` — storage для фото растений и участков
3. `supabase/user_plants_and_submissions.sql` — личный дневник и заявки
4. `supabase/plant_favorites_and_profile_extensions.sql` — **избранное, аватар, email-настройки, синхронизация prefs**
5. `supabase/fix_admin_category_insert.sql` — права админа на каталог

Дополнительно при необходимости: `fix_broken_image_urls.sql`, `reminders_rls.sql`, `admin_catalog_rls.sql`.

Назначить админа:

```sql
update public.profiles set role_id = 2 where email = 'ваш@email.com';
```

## Email-дайджест (опционально)

По умолчанию на главной показывается баннер **«Открыть в почте»** (mailto).

Для автоматической отправки писем:

1. Зарегистрируйтесь на [Resend](https://resend.com) и получите API key
2. Задеплойте Edge Function:
   ```bash
   supabase functions deploy send-email-digest
   supabase secrets set RESEND_API_KEY=re_xxx DIGEST_FROM_EMAIL="Plant Planner <noreply@yourdomain.com>"
   ```
3. В профиле включите **Email-напоминания**

Функция: `supabase/functions/send-email-digest/index.ts`

## Скрипты

| Команда | Описание |
|---|---|
| `npm run dev` | Dev-сервер |
| `npm run build` | Production-сборка |
| `npm run preview` | Превью сборки |
| `npm run test` | Unit-тесты (Vitest) |
| `npm run lint` | ESLint |
| `npm run icons` | Генерация favicon/PWA-иконок |

## Стек

React 19 · Vite 8 · Tailwind CSS 4 · Zustand · Supabase · React Router 7

## Приватность

Профиль **только личный** — публичных страниц пользователей нет. Данные сада видны только владельцу (RLS в Supabase).
