# Мой огород

Веб-приложение для планирования участка: грядки, рассада, каталог растений, напоминания и лунный календарь.

**Production:** https://plant-planner-nu.vercel.app

**Обзор сайта для ИИ (без входа):** https://plant-planner-nu.vercel.app/guide

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

## База данных (Supabase → SQL Editor)

Для **нового** проекта выполните один файл: `supabase/complete_database.sql` (см. `supabase/README.md`).

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
   supabase secrets set RESEND_API_KEY=re_xxx DIGEST_FROM_EMAIL="Мой огород <noreply@yourdomain.com>"
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
