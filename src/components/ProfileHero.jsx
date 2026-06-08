import { Link } from 'react-router-dom'
import { MapPin, Shield, Calendar, User } from 'lucide-react'

export default function ProfileHero({ profile, isAdmin }) {
  const initial = (profile?.full_name || profile?.email || 'П')[0].toUpperCase()
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="relative rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-6">
      <div
        className="absolute inset-x-0 top-0 h-28 sm:h-32 bg-gradient-to-b from-green-100 via-emerald-50/80 to-transparent pointer-events-none"
        aria-hidden
      />

      <div className="relative px-4 sm:px-6 py-5 sm:py-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] bg-green-100 rounded-2xl flex items-center justify-center shrink-0 border border-green-200/60">
            <span className="text-2xl sm:text-3xl font-bold text-green-700">{initial}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {profile?.full_name || 'Садовод'}
              </h2>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-xs font-medium hover:bg-purple-200"
                >
                  <Shield className="w-3 h-3" /> Админ
                </Link>
              )}
            </div>
            <p className="text-sm text-gray-600 truncate">{profile?.email}</p>
          </div>
        </div>

        {(profile?.city || memberSince) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            {profile?.city && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs">
                <MapPin className="w-3.5 h-3.5 text-green-600" />
                {profile.city}
              </span>
            )}
            {memberSince && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs">
                <Calendar className="w-3.5 h-3.5 text-green-600" />
                На сайте с {memberSince}
              </span>
            )}
          </div>
        )}

        {!profile?.city && !memberSince && (
          <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> Личный кабинет
          </p>
        )}
      </div>
    </div>
  )
}
