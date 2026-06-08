import { createElement, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import {
  BarChart3, User, Settings, Save, Bell, Moon, Sprout,
  MapPin, CloudRain, Mail, Download,
} from 'lucide-react'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'
import ProfileHero from '../components/ProfileHero'
import ProfileStatsPanel from '../components/ProfileStatsPanel'
import ProfileAccountPanel from '../components/ProfileAccountPanel'
import { notificationService } from '../services/notificationService'
import { fetchProfileStats } from '../services/profileStatsService'
import { loadProfilePrefs, saveProfilePrefs } from '../lib/profilePrefs'
import { toast } from '../store/toastStore'

export default function Profile() {
  const { profile, setProfile, isAdmin, signOut } = useAuthStore()
  const [activeTab, setActiveTab] = useState('account')
  const [statsData, setStatsData] = useState(null)
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [city, setCity] = useState(profile?.city || '')
  const [notifications, setNotifications] = useState(profile?.notification_enabled ?? true)
  const [lunarEnabled, setLunarEnabled] = useState(() => loadProfilePrefs().lunarEnabled)
  const [weatherAlerts, setWeatherAlerts] = useState(() => loadProfilePrefs().weatherAlerts)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name || '')
    setCity(profile?.city || '')
    setNotifications(profile?.notification_enabled ?? true)
  }, [profile?.full_name, profile?.city, profile?.notification_enabled])

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const userId = profile?.id
      if (!userId) {
        setStatsData(null)
        return
      }
      const data = await fetchProfileStats(userId)
      setStatsData(data)
    } catch (e) {
      console.error(e)
      toast.error('Не удалось загрузить статистику')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    if (activeTab !== 'stats') return
    loadStats()
  }, [activeTab, loadStats])

  async function saveProfile() {
    setSaving(true)
    const updates = {
      full_name: fullName,
      notification_enabled: notifications,
      city: city.trim() || null,
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, ...updates })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      toast.success('Профиль сохранён')
    } else {
      toast.error('Не удалось сохранить профиль')
    }
    setSaving(false)
  }

  function saveLocalPrefs(next) {
    saveProfilePrefs({
      lunarEnabled: next.lunarEnabled ?? lunarEnabled,
      weatherAlerts: next.weatherAlerts ?? weatherAlerts,
    })
  }

  function exportStats() {
    if (!statsData) return
    const blob = new Blob([JSON.stringify({ ...statsData, exportedAt: new Date().toISOString() }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plant-planner-stats-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    { key: 'account', label: 'Аккаунт', icon: User },
    { key: 'stats', label: 'Статистика', icon: BarChart3 },
    { key: 'settings', label: 'Настройки', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0">
      <Header />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Личный кабинет</h1>
          {activeTab === 'stats' && statsData && (
            <button
              onClick={exportStats}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Экспорт
            </button>
          )}
        </div>

        <ProfileHero profile={profile} isAdmin={isAdmin} />

        <div className="bg-white rounded-2xl shadow-sm p-1.5 mb-6 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'stats' && <ProfileStatsPanel data={statsData} loading={loading} />}

        {activeTab === 'account' && (
          <ProfileAccountPanel
            profile={profile}
            isAdmin={isAdmin}
            fullName={fullName}
            setFullName={setFullName}
            city={city}
            setCity={setCity}
            notifications={notifications}
            saving={saving}
            saved={saved}
            onSave={saveProfile}
            onSignOut={signOut}
          />
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            <div className="p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-600" /> Уведомления
              </h3>
              <div className="space-y-4">
                <ToggleRow
                  icon={Bell}
                  title="Push-уведомления"
                  desc="Напоминания о задачах в браузере"
                  enabled={notifications}
                  onChange={async () => {
                    if (!notifications) {
                      const granted = await notificationService.requestPermission()
                      if (granted) setNotifications(true)
                    } else {
                      setNotifications(false)
                    }
                  }}
                />
                <ToggleRow
                  icon={Mail}
                  title="Email-уведомления"
                  desc="Письма о задачах и событиях"
                  enabled={false}
                  disabled
                  badge="Скоро"
                  onChange={() => toast.info('Email-уведомления в разработке')}
                />
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Sprout className="w-5 h-5 text-gray-600" /> Садоводство
              </h3>
              <div className="space-y-4">
                <ToggleRow
                  icon={Moon}
                  title="Лунный календарь"
                  desc="Показывать рекомендации по луне на главной"
                  enabled={lunarEnabled}
                  onChange={() => {
                    const next = !lunarEnabled
                    setLunarEnabled(next)
                    saveLocalPrefs({ lunarEnabled: next })
                  }}
                />
                <ToggleRow
                  icon={CloudRain}
                  title="Погодные предупреждения"
                  desc="Уведомления о заморозках и неблагоприятной погоде"
                  enabled={weatherAlerts}
                  onChange={() => {
                    const next = !weatherAlerts
                    setWeatherAlerts(next)
                    saveLocalPrefs({ weatherAlerts: next })
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3">Настройки садоводства сохраняются на этом устройстве</p>
            </div>

            <div className="p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-600" /> Местоположение
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Город задаётся во вкладке «Аккаунт» и используется для прогноза погоды.
              </p>
              {profile?.city ? (
                <p className="text-sm font-medium text-gray-800">{profile.city}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('account')}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Указать город →
                </button>
              )}
            </div>

            <div className="p-4 sm:p-6">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
              >
                {saving ? 'Сохранение...' : saved ? '✅ Настройки сохранены!' : <><Save className="w-5 h-5" /> Сохранить настройки</>}
              </button>
            </div>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  )
}

function ToggleRow({ icon, title, desc, enabled, onChange, disabled, badge }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
          {createElement(icon, { className: 'w-4 h-4' })}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm flex items-center gap-2">
            {title}
            {badge && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-normal">{badge}</span>
            )}
          </p>
          <p className="text-xs text-gray-500">{desc}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          disabled ? 'bg-gray-200 cursor-not-allowed' : enabled ? 'bg-green-600' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  )
}
