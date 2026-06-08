import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Sprout, LogOut, User } from 'lucide-react'

export default function Header() {
  const { profile, signOut, isAdmin } = useAuthStore()

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Левая часть — логотип */}
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
            <Sprout className="w-5 h-5 text-green-600" />
          </div>
          <span className="text-lg font-semibold text-gray-800">Plant Planner</span>
        </Link>

        {/* Правая часть — пользователь */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <Link to="/admin" className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">
              ⚙️ Админ
            </Link>
          )}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-gray-200">
            <Link to="/profile" className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-green-600" />
                )}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
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
  )
}