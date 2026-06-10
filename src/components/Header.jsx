import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Sprout, LogOut, Shield } from 'lucide-react'
import AvatarImage from './AvatarImage'
import { MAIN_NAV_LINKS, isNavLinkActive } from '../lib/navLinks'

export default function Header() {
  const { profile, signOut, isAdmin } = useAuthStore()
  const { pathname } = useLocation()
  const initial = (profile?.full_name || profile?.email || 'С')[0].toUpperCase()

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 min-w-0">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
            <Sprout className="w-5 h-5 text-green-600" />
          </div>
          <span className="hidden lg:inline text-lg font-semibold text-gray-800">Мой огород</span>
        </Link>

        <nav className="hidden md:flex flex-1 items-center justify-center gap-0.5 lg:gap-1 min-w-0 overflow-x-auto">
          {MAIN_NAV_LINKS.map((link) => {
            const active = isNavLinkActive(pathname, link.to)
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <link.icon className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline">{link.label}</span>
                <span className="lg:hidden text-xs">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto md:ml-0">
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Админ</span>
            </Link>
          )}
          <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-gray-200">
            <Link to="/profile" className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-1.5 sm:px-2 py-1 transition-colors">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                <AvatarImage
                  src={profile?.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                  initial={initial}
                  initialClassName="text-sm font-bold text-green-700"
                  iconClassName="w-4 h-4 text-green-600"
                />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden xl:block max-w-[120px] truncate">
                {profile?.full_name || 'Садовод'}
              </span>
            </Link>
            <button
              onClick={signOut}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </header>
      <div
        className="h-[calc(3.25rem+env(safe-area-inset-top,0px))] sm:h-[calc(3.5rem+env(safe-area-inset-top,0px))] shrink-0"
        aria-hidden="true"
      />
    </>
  )
}
