import { Home, LayoutGrid, Flower, BookOpen, Calendar, Moon } from 'lucide-react'

export const MAIN_NAV_LINKS = [
  { to: '/dashboard', label: 'Главная', icon: Home },
  { to: '/gardens', label: 'Участки', icon: LayoutGrid },
  { to: '/pots', label: 'Рассада', icon: Flower },
  { to: '/catalog', label: 'Каталог', icon: BookOpen },
  { to: '/reminders', label: 'Задачи', icon: Calendar },
  { to: '/lunar', label: 'Лунный календарь', shortLabel: 'Луна', icon: Moon },
]

export function isNavLinkActive(pathname, to) {
  if (to === '/dashboard') return pathname === '/dashboard'
  if (to === '/gardens') {
    return pathname === '/gardens' || pathname.startsWith('/garden/') || pathname.startsWith('/bed/')
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}
