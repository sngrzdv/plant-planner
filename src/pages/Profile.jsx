import { createElement, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import {
  BarChart3, User, Settings, Bell, Moon, Sprout,
  MapPin, CloudRain, Mail, HelpCircle,
} from 'lucide-react'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'
import ProfileHero from '../components/ProfileHero'
import ProfileStatsPanel from '../components/ProfileStatsPanel'
import ProfileAccountPanel from '../components/ProfileAccountPanel'
import AutoSaveIndicator from '../components/AutoSaveIndicator'
import { notificationService } from '../services/notificationService'
import { fetchGardenSeasonStats } from '../services/gardenSeasonStatsService'
import { profileToPrefs, saveProfilePrefs, prefsToDbColumns } from '../lib/profilePrefs'
import { useAutoSave } from '../hooks/useAutoSave'
import { toast } from '../store/toastStore'
import { resetOnboarding } from '../lib/onboardingStorage'

export default function Profile() {
  const navigate = useNavigate()
  const { profile, setProfile, isAdmin, signOut } = useAuthStore()
  const [activeTab, setActiveTab] = useState('account')
  const [statsData, setStatsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear())

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [city, setCity] = useState(profile?.city || '')
  const [notifications, setNotifications] = useState(profile?.notification_enabled ?? true)
  const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications_enabled ?? false)
  const initialPrefs = profileToPrefs(profile)
  const [lunarEnabled, setLunarEnabled] = useState(initialPrefs.lunarEnabled)
  const [weatherAlerts, setWeatherAlerts] = useState(initialPrefs.weatherAlerts)

  useEffect(() => {
    setFullName(profile?.full_name || '')
    setCity(profile?.city || '')
    setNotifications(profile?.notification_enabled ?? true)
    setEmailNotifications(profile?.email_notifications_enabled ?? false)
    const prefs = profileToPrefs(profile)
    setLunarEnabled(prefs.lunarEnabled)
    setWeatherAlerts(prefs.weatherAlerts)
  }, [
    profile?.id,
    profile?.full_name,
    profile?.city,
    profile?.notification_enabled,
    profile?.email_notifications_enabled,
    profile?.lunar_enabled,
    profile?.weather_alerts_enabled,
  ])

  const persistProfile = useCallback(async () => {
    if (!profile?.id) return

    const updates = {
      full_name: fullName,
      notification_enabled: notifications,
      email_notifications_enabled: emailNotifications,
      city: city.trim() || null,
      ...prefsToDbColumns({ lunarEnabled, weatherAlerts }),
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    if (error) {
      toast.error('Не удалось сохранить настройки')
      throw error
    }

    saveProfilePrefs({ lunarEnabled, weatherAlerts })
    setProfile({ ...profile, ...updates })
  }, [profile, fullName, city, notifications, emailNotifications, lunarEnabled, weatherAlerts, setProfile])

  const autoSaveStatus = useAutoSave({
    save: persistProfile,
    enabled: Boolean(profile?.id) && (activeTab === 'account' || activeTab === 'settings'),
    delay: activeTab === 'account' ? 800 : 300,
    resetKey: profile?.id,
    deps: [fullName, city, notifications, emailNotifications, lunarEnabled, weatherAlerts, activeTab],
  })

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const userId = profile?.id
      if (!userId) {
        setStatsData(null)
        return
      }
      const data = await fetchGardenSeasonStats(userId, seasonYear, profile?.full_name || '')
      setStatsData(data)
      if (data?.availableYears?.length && !data.availableYears.includes(seasonYear)) {
        setSeasonYear(data.availableYears[0])
      }
    } catch (e) {
      console.error(e)
      toast.error('Не удалось загрузить статистику')
    } finally {
      setLoading(false)
    }
  }, [profile?.id, profile?.full_name, seasonYear])

  useEffect(() => {
    if (activeTab !== 'stats') return
    loadStats()
  }, [activeTab, loadStats])

  function handleSeasonYearChange(year) {
    setSeasonYear(year)
  }

  async function toggleNotifications() {
    if (!notifications) {
      const granted = await notificationService.requestPermission()
      if (granted) setNotifications(true)
    } else {
      setNotifications(false)
    }
  }

  function toggleLunar() {
    const next = !lunarEnabled
    setLunarEnabled(next)
    saveProfilePrefs({ lunarEnabled: next, weatherAlerts })
  }

  function toggleWeatherAlerts() {
    const next = !weatherAlerts
    setWeatherAlerts(next)
    saveProfilePrefs({ lunarEnabled, weatherAlerts: next })
  }

  function replayOnboarding() {
    if (!profile?.id) return
    resetOnboarding(profile.id)
    navigate('/dashboard')
  }

  const tabs = [
    { key: 'account', label: 'Аккаунт', icon: User },
    { key: 'stats', label: 'Статистика', icon: BarChart3 },
    { key: 'settings', label: 'Настройки', icon: Settings },
  ]

  return (
    <div className="page-shell min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0 overflow-x-hidden">
      <Header />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Личный кабинет</h1>
          <div className="flex items-center gap-3">
            <AutoSaveIndicator status={autoSaveStatus} />
          </div>
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

        {activeTab === 'stats' && (
          <ProfileStatsPanel
            data={statsData}
            loading={loading}
            seasonYear={seasonYear}
            onSeasonYearChange={handleSeasonYearChange}
          />
        )}

        {activeTab === 'account' && (
          <ProfileAccountPanel
            profile={profile}
            isAdmin={isAdmin}
            fullName={fullName}
            setFullName={setFullName}
            city={city}
            setCity={setCity}
            notifications={notifications}
            onSignOut={signOut}
            onProfileUpdate={setProfile}
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
                  onChange={toggleNotifications}
                />
                <ToggleRow
                  icon={Mail}
                  title="Email-напоминания"
                  desc="Дайджест задач на почту (если настроена Edge Function) или кнопка «Открыть в почте» на главной"
                  enabled={emailNotifications}
                  onChange={() => setEmailNotifications(!emailNotifications)}
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
                  onChange={toggleLunar}
                />
                <ToggleRow
                  icon={CloudRain}
                  title="Погодные предупреждения"
                  desc="Push-уведомления о заморозках и неблагоприятной погоде"
                  enabled={weatherAlerts}
                  onChange={toggleWeatherAlerts}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3">Настройки синхронизируются с аккаунтом</p>
            </div>

            <div className="p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-gray-600" /> Помощь
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Краткий обзор разделов приложения: участки, рассада, каталог и задачи.
              </p>
              <button
                type="button"
                onClick={replayOnboarding}
                className="text-sm font-medium text-green-600 hover:text-green-700"
              >
                Показать подсказки снова →
              </button>
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
