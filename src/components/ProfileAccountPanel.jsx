import { Link } from 'react-router-dom'
import { Mail, MapPin, Shield, Bell, LogOut } from 'lucide-react'
import ChangePasswordPanel from './ChangePasswordPanel'
import ChangeEmailPanel from './ChangeEmailPanel'
import ProfileAvatarUpload from './ProfileAvatarUpload'

export default function ProfileAccountPanel({
  profile,
  isAdmin,
  fullName,
  setFullName,
  city,
  setCity,
  notifications,
  onSignOut,
  onProfileUpdate,
}) {
  const memberDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">Личные данные</h3>

        <ProfileAvatarUpload profile={profile} onUpdated={onProfileUpdate} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Как к вам обращаться"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={profile?.email || ''}
              readOnly
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <ChangeEmailPanel currentEmail={profile?.email} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Например: Москва"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Используется для прогноза погоды на главной. Сохраняется автоматически.</p>
        </div>
      </div>

      <ChangePasswordPanel email={profile?.email} />

      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
        <h3 className="font-semibold text-gray-800 mb-4">О аккаунте</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <InfoRow label="Дата регистрации" value={memberDate} />
          <InfoRow label="Роль" value={isAdmin ? 'Администратор' : 'Садовод'} />
          <InfoRow
            label="Push-уведомления"
            value={notifications ? 'Включены' : 'Выключены'}
            icon={Bell}
          />
          {profile?.city && <InfoRow label="Город" value={profile.city} icon={MapPin} />}
        </dl>
        {isAdmin && (
          <Link
            to="/admin"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100"
          >
            <Shield className="w-4 h-4" /> Панель администратора
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-red-100">
        <h3 className="font-semibold text-gray-800 mb-2">Выход из аккаунта</h3>
        <p className="text-sm text-gray-500 mb-4">Вы выйдете из Plant Planner на этом устройстве.</p>
        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" /> Выйти
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <dt className="text-xs text-gray-400 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </dt>
      <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
    </div>
  )
}
