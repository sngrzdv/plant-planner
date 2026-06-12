# Скриншоты сайта для ИИ и пояснительной записки

PNG-файлы здесь позволяют ИИ с «зрением» (и вам для диплома) увидеть реальный интерфейс без ручного обхода.

## Как сгенерировать

1. Создайте **тестовый аккаунт** на https://plant-planner-nu.vercel.app/register  
   (или используйте существующий).

2. Добавьте в `.env` (не коммитить):

```env
DEMO_EMAIL=ваш-тест@example.com
DEMO_PASSWORD=ваш-пароль
# опционально:
SCREENSHOT_BASE_URL=https://plant-planner-nu.vercel.app
# или локально: SCREENSHOT_BASE_URL=http://localhost:5173
```

3. Установите браузер для Playwright (один раз):

```bash
npx playwright install chromium
```

4. Запустите:

```bash
npm run screenshots
```

Скриншоты появятся в этой папке: `01-login.png`, `02-dashboard.png`, …

## Что снимается

- Все публичные страницы
- Все основные разделы после входа
- Первое растение в каталоге (`/plant/:id`)
- Первый участок и грядка (если есть у тестового пользователя)
- Админ-панель (только если у аккаунта `role_id = 2`)

## Для Cursor / ChatGPT

Прикрепите PNG из этой папки к чату или укажите агенту путь `docs/screenshots/`.

Текстовый обзор без скриншотов: `/guide` или `src/content/siteGuideContent.js`.
