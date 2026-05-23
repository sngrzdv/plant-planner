import { Link, useLocation } from 'react-router-dom'
import { LayoutGrid, Flower, BookOpen, Calendar, Moon } from 'lucide-react'

export default function MobileNav() {
  const location = useLocation()
  const currentPath = location.pathname

  const links = [
    { to: '/dashboard', icon: LayoutGrid, label: 'Главная' },
    { to: '/gardens', icon: LayoutGrid, label: 'Участки' },
    { to: '/pots', icon: Flower, label: 'Рассада' },
    { to: '/catalog', icon: BookOpen, label: 'Каталог' },
    { to: '/reminders', icon: Calendar, label: 'Задачи' },
  ]

  const isActive = (path) => {
    if (path === '/dashboard') return currentPath === '/dashboard'
    return currentPath.startsWith(path)
  }

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-bottom">
      <div className="flex items-center justify-around">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex flex-col items-center py-2 px-3 min-w-0 ${
              isActive(link.to) ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <link.icon className="w-5 h-5" />
            <span className="text-xs mt-0.5">{link.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}