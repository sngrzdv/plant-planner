# Мой огород — руководство для ИИ-ассистентов

Веб-приложение для планирования дачного участка. Этот файл помогает агенту быстро понять весь сайт без ручного обхода каждого экрана.

## Быстрый доступ

| Что | Где |
|-----|-----|
| Production | https://plant-planner-nu.vercel.app |
| **Полное описание UI (публично)** | https://plant-planner-nu.vercel.app/guide |
| Маршруты в коде | `src/App.jsx` |
| Описание UI (источник правды) | `src/content/siteGuideContent.js` |
| Скрипт БД | `supabase/complete_database.sql` |
| Скриншоты экранов | `docs/screenshots/` (генерация: `npm run screenshots`) |

## Как «увидеть» весь сайт

1. **Текст** — прочитайте `src/content/siteGuideContent.js` или откройте `/guide` на production (без логина).
2. **Код UI** — `src/pages/*.jsx`, `src/components/*.jsx`.
3. **Скриншоты** — выполните `npm run screenshots` с тестовым аккаунтом (см. `docs/screenshots/README.md`), затем просматривайте PNG в `docs/screenshots/`.
4. **Живой сайт** — нужен вход: зарегистрируйте тестового пользователя или используйте `DEMO_EMAIL` / `DEMO_PASSWORD` из `.env` (не коммитить).

## Все маршруты

| Путь | Авторизация | Файл |
|------|-------------|------|
| `/guide` | нет | `SiteGuide.jsx` |
| `/login`, `/register`, `/reset-password` | нет | `Login.jsx`, `Register.jsx`, … |
| `/terms`, `/privacy` | нет | `LegalPage.jsx` |
| `/dashboard` | да | `App.jsx` (Dashboard) |
| `/gardens` | да | `MyGardens.jsx` |
| `/garden/:id`, `/garden/:id/edit` | да | `GardenView.jsx`, `GardenEditor.jsx` |
| `/bed/:id/edit` | да | `BedEditor.jsx` |
| `/catalog`, `/plant/:id` | да | `PlantsCatalog.jsx`, `PlantDetail.jsx` |
| `/pots` | да | `Pots.jsx` |
| `/reminders` | да | `Reminders.jsx` |
| `/lunar` | да | `LunarCalendar.jsx` |
| `/profile` | да | `Profile.jsx` |
| `/admin` | да + role_id=2 | `AdminPanel.jsx` |

## Архитектура (кратко)

- **UI:** React SPA, Tailwind, Lucide icons
- **Состояние:** Zustand (`authStore`, `referenceStore`, `toastStore`, `confirmStore`)
- **Логика:** `src/services/` (reminderService, plantingService, …)
- **БД:** Supabase PostgreSQL + RLS + Auth + Storage
- **Деплой:** Vercel; proxy `/supabase` для работы в РФ без VPN

## Ключевые сценарии

1. Регистрация → профиль в `profiles` → главная
2. Создание участка → редактор → грядка → посадка → автозадачи
3. Задачи на `/reminders` и виджет на главной

## Ограничения для агента

- Нет публичного доступа к личным данным пользователей (RLS).
- `.env` не читать и не коммитить.
- Админ-панель только при `profiles.role_id = 2`.
