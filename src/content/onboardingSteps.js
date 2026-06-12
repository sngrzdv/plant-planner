import { LayoutGrid, Flower, BookOpen, Calendar, Moon, Sprout } from 'lucide-react'

export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    icon: Sprout,
    emoji: '🌱',
    accent: 'from-emerald-500 via-green-500 to-teal-600',
    title: 'Добро пожаловать!',
    description:
      '«Мой огород» — ваш помощник на даче: план участка, рассада, справочник культур и календарь ухода.',
    tips: [
      'Начните с создания участка — нарисуйте грядки и клумбы.',
      'Подсказки можно пропустить и открыть снова в профиле.',
    ],
  },
  {
    id: 'gardens',
    icon: LayoutGrid,
    emoji: '🗺️',
    accent: 'from-blue-500 via-indigo-500 to-violet-600',
    title: 'Участки и план',
    description:
      'Создайте огород на карте: грядки, клумбы, теплица, деревья и кусты — всё на одном плане.',
    tips: [
      'Двойной клик по грядке открывает редактор посадки.',
      'На просмотре участка видно, что где растёт.',
    ],
    link: { to: '/gardens?action=create', label: 'Создать участок' },
  },
  {
    id: 'pots',
    icon: Flower,
    emoji: '🪴',
    accent: 'from-amber-400 via-orange-500 to-rose-500',
    title: 'Рассада',
    description:
      'Записывайте посевы в горшках — приложение напомнит, когда пересаживать на грядку.',
    tips: [
      'Укажите дату посева — график ухода построится автоматически.',
      'После пересадки растение появится на плане участка.',
    ],
    link: { to: '/pots?action=add', label: 'Добавить рассаду' },
  },
  {
    id: 'catalog',
    icon: BookOpen,
    emoji: '📖',
    accent: 'from-cyan-500 via-sky-500 to-blue-600',
    title: 'Каталог культур',
    description:
      'Справочник овощей, зелени, цветов и ягод — с подсказками по поливу и срокам созревания.',
    tips: [
      'Для клумбы и грядки подходят разные культуры.',
      'Можно вести личный дневник или предложить растение в каталог.',
    ],
    link: { to: '/catalog', label: 'Открыть каталог' },
  },
  {
    id: 'tasks',
    icon: Calendar,
    emoji: '✅',
    accent: 'from-red-400 via-rose-500 to-pink-600',
    title: 'Задачи',
    description:
      'После посадки или посева приложение создаст расписание полива, подкормки и сбора урожая.',
    tips: [
      'Задачи на сегодня — прямо на главной.',
      'Отмечайте выполненное кнопкой «Готово».',
    ],
    link: { to: '/reminders', label: 'К задачам' },
  },
  {
    id: 'extras',
    icon: Moon,
    emoji: '🌙',
    accent: 'from-violet-500 via-purple-500 to-fuchsia-600',
    title: 'Ещё полезное',
    description: 'Лунный календарь, погода по вашему городу и удобная навигация.',
    tips: [
      'Лунный календарь — благоприятные дни для посадки.',
      'На телефоне меню внизу, на компьютере — в шапке.',
    ],
    link: { to: '/profile', label: 'Настроить профиль' },
  },
]
