import { weatherApi } from './services/weatherApi'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { createElement, lazy, Suspense, useEffect, useState, useRef } from 'react'
import NotificationRunner from './components/NotificationRunner'
import PageNotFound from './components/PageNotFound'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import { 
  LayoutGrid, Flower, Calendar, 
  CheckCircle, BookOpen, CloudRain, Droplets, Wind, Leaf, Sprout, Zap, Sparkles
} from 'lucide-react'
import Header from './components/Header'
import EmailDigestBanner from './components/EmailDigestBanner'
import { getMoonData } from './utils/lunar'
import { notificationService } from './services/notificationService'
import { reminderService } from './services/reminderService'
import { fetchPendingReminders, pickTodayTasks, invalidatePendingRemindersCache } from './services/pendingRemindersService'
import { useReferenceStore } from './store/referenceStore'
import { useProfilePrefs } from './hooks/useProfilePrefs'

import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import LegalPage from './pages/LegalPage'
import SiteGuide from './pages/SiteGuide'
import MobileNav from './components/MobileNav'
import ToastContainer from './components/ToastContainer'
import ConfirmDialog from './components/ConfirmDialog'
import AppOnboarding from './components/AppOnboarding'
import { hasCompletedOnboarding, hasSeenWelcome, markWelcomeSeen } from './lib/onboardingStorage'

const MyGardens = lazy(() => import('./pages/MyGardens'))
const GardenEditor = lazy(() => import('./pages/GardenEditor'))
const GardenView = lazy(() => import('./pages/GardenView'))
const BedEditor = lazy(() => import('./pages/BedEditor'))
const PlantsCatalog = lazy(() => import('./pages/PlantsCatalog'))
const PlantDetail = lazy(() => import('./pages/PlantDetail'))
const Pots = lazy(() => import('./pages/Pots'))
const PotsJournal = lazy(() => import('./pages/PotsJournal'))
const Reminders = lazy(() => import('./pages/Reminders'))
const LunarCalendar = lazy(() => import('./pages/LunarCalendar'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const Profile = lazy(() => import('./pages/Profile'))

function getLunarAdviceForToday() {
  try {
    const moonData = getMoonData(new Date())
    if (moonData.type === 'new_moon' || moonData.type === 'full_moon') {
      return { text: `${moonData.phase} — отдохните. Полив и посадку лучше отложить.`, emoji: moonData.emoji }
    }
    if (moonData.type.includes('waxing')) {
      return { text: `${moonData.phase}. Отличное время для посадки и пересадки!`, emoji: moonData.emoji }
    }
    return { text: `${moonData.phase}. Хорошо для корнеплодов, обрезки и полива.`, emoji: moonData.emoji }
  } catch (error) {
    console.debug('Lunar advice unavailable', error)
    return { text: '', emoji: null }
  }
}

async function safeSupabaseQuery(query, fallback) {
  try {
    const result = await query
    if (result?.error) {
      console.warn('Dashboard query error:', result.error.message)
      return fallback
    }
    return result
  } catch (err) {
    console.warn('Dashboard query failed:', err)
    return fallback
  }
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function LazyPage({ children }) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ProtectedRoute>
  )
}

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
  if (!user) return <Navigate to="/login" />
  return children
}

function App() {
  const { setUser, setProfile, setLoading, loadProfile } = useAuthStore()

  useEffect(() => {
    let skipNextInitial = false

    const syncSession = async (session, { blockUi = true } = {}) => {
      if (!session?.user) {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      setUser(session.user)
      if (blockUi) {
        setLoading(false)
      }

      const profile = await loadProfile(session.user.id)
      if (profile?.is_blocked) {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        return
      }

      // Каталог подгружаем в фоне — не блокирует главную (там только count).
      window.setTimeout(() => {
        useReferenceStore.getState().preloadReferences()
      }, 4000)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      skipNextInitial = true
      syncSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return
      if (event === 'INITIAL_SESSION' && skipNextInitial) {
        skipNextInitial = false
        return
      }
      syncSession(session, { blockUi: false })
    })

    return () => subscription.unsubscribe()
  }, [loadProfile, setLoading, setProfile, setUser])

  return (
    <Router>
      <ToastContainer />
      <ConfirmDialog />
      <NotificationRunner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/guide" element={<SiteGuide />} />
        <Route path="/terms" element={<LegalPage doc="terms" />} />
        <Route path="/privacy" element={<LegalPage doc="privacy" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/gardens" element={<LazyPage><MyGardens /></LazyPage>} />
        <Route path="/catalog" element={<LazyPage><PlantsCatalog /></LazyPage>} />
        <Route path="/plant/:id" element={<LazyPage><PlantDetail /></LazyPage>} />
        <Route path="/pots" element={<LazyPage><Pots /></LazyPage>} />
        <Route path="/pots/journal" element={<LazyPage><PotsJournal /></LazyPage>} />
        <Route path="/reminders" element={<LazyPage><Reminders /></LazyPage>} />
        <Route path="/lunar" element={<LazyPage><LunarCalendar /></LazyPage>} />
        <Route path="/admin" element={<LazyPage><AdminPanel /></LazyPage>} />
        <Route path="/profile" element={<LazyPage><Profile /></LazyPage>} />
        <Route path="/garden/:id/edit" element={<LazyPage><GardenEditor /></LazyPage>} />
        <Route path="/garden/:id" element={<LazyPage><GardenView /></LazyPage>} />
        <Route path="/bed/:id/edit" element={<LazyPage><BedEditor /></LazyPage>} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route
          path="*"
          element={
            <PageNotFound
              title="Страница не найдена"
              message="Такого адреса нет. Проверьте ссылку или вернитесь на главную."
              backTo="/dashboard"
              backLabel="На главную"
            />
          }
        />
      </Routes>
    </Router>
  )
}

function Dashboard() {
  const { user, profile } = useAuthStore()
  const prefs = useProfilePrefs()
  const userId = user?.id
  const [weather, setWeather] = useState(null)
  const [weatherError, setWeatherError] = useState(false)
  const [lunarAdvice] = useState(getLunarAdviceForToday)
  const [stats, setStats] = useState({ gardens: 0, pots: 0, tasks: 0, catalog: 0 })
  const [todayTasks, setTodayTasks] = useState([])
  const [pendingReminders, setPendingReminders] = useState([])
  const [digestDismissed, setDigestDismissed] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [completingTask, setCompletingTask] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const welcomeStateRef = useRef({ userId: null, isFirst: false, marked: false })

  if (userId && welcomeStateRef.current.userId !== userId) {
    welcomeStateRef.current = {
      userId,
      isFirst: !hasSeenWelcome(userId),
      marked: false,
    }
  }

  const isFirstVisit = userId ? welcomeStateRef.current.isFirst : false

  useEffect(() => {
    if (!userId || welcomeStateRef.current.marked) return
    if (welcomeStateRef.current.isFirst) {
      markWelcomeSeen(userId)
    }
    welcomeStateRef.current.marked = true
  }, [userId])

  useEffect(() => {
    if (!userId) return undefined
    const timer = setTimeout(() => {
      if (!hasCompletedOnboarding(userId)) {
        setShowOnboarding(true)
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [userId])

  useEffect(() => {
    if (!userId) return

    const loadDashboard = async () => {
      setLoadingTasks(true)
      const today = new Date().toISOString().split('T')[0]

      const [
        weatherData,
        statsResults,
        catalogPlants,
        pendingReminders,
      ] = await Promise.all([
        weatherApi.getWeather(profile?.city || null).catch(() => null),
        Promise.all([
          safeSupabaseQuery(supabase.from('layouts').select('id', { count: 'exact', head: true }).eq('user_id', userId), { count: 0 }),
          safeSupabaseQuery(supabase.from('pots').select('id', { count: 'exact', head: true }).eq('status', 'growing').eq('user_id', userId), { count: 0 }),
        ]),
        useReferenceStore.getState().getPlantsCount().catch(() => 0),
        fetchPendingReminders(userId).catch(() => []),
      ])

      if (weatherData) {
        setWeather(weatherData)
        setWeatherError(false)
      } else {
        setWeatherError(true)
      }

      const [{ count: gardens }, { count: pots }] = statsResults
      const pending = pendingReminders || []
      setStats({
        gardens: gardens || 0,
        pots: pots || 0,
        tasks: pending.length,
        catalog: catalogPlants || 0,
      })
      setTodayTasks(pickTodayTasks(pending, today))
      setPendingReminders(pending)
      setLoadingTasks(false)
    }

    loadDashboard()
    const interval = setInterval(loadDashboard, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [userId, profile?.city])

  async function completeTask(taskId) {
    setCompletingTask(taskId)
    try {
      const result = await reminderService.completeReminder(userId, taskId)

      if (!result.ok) throw result.error

      invalidatePendingRemindersCache()
      setTodayTasks(prev => prev.filter(task => task.id !== taskId))
      setPendingReminders(prev => prev.filter(task => task.id !== taskId))
      setStats(prev => ({ ...prev, tasks: Math.max(0, prev.tasks - 1) }))
      
      notificationService.success('Задача выполнена')
    } catch (e) {
      console.error('Error completing task:', e)
      notificationService.error(e?.message || 'Не удалось выполнить задачу')
    } finally {
      setCompletingTask(null)
    }
  }

  return (
    <div className="page-shell min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 overflow-x-hidden">
      <Header />
      {showOnboarding && (
        <AppOnboarding
          userId={userId}
          userName={profile?.full_name?.split(/\s+/)[0]}
          onClose={() => setShowOnboarding(false)}
        />
      )}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20 sm:pb-6 overflow-x-hidden">
        
        {/* Приветствие */}
        <div
          className={`rounded-2xl p-4 sm:p-6 relative overflow-hidden ${
            isFirstVisit
              ? 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white shadow-lg shadow-green-600/20'
              : 'bg-gradient-to-r from-green-100 to-emerald-100'
          }`}
        >
          {isFirstVisit && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" aria-hidden />
          )}
          <div className="relative flex items-start gap-3">
            {isFirstVisit && (
              <div className="hidden sm:flex w-12 h-12 bg-white/20 backdrop-blur rounded-xl items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-white" aria-hidden />
              </div>
            )}
            <div>
              <h2 className={`text-xl sm:text-2xl font-bold break-words ${isFirstVisit ? 'text-white' : 'text-gray-800'}`}>
                {profile?.full_name
                  ? isFirstVisit
                    ? `Добро пожаловать, ${profile.full_name}!`
                    : `С возвращением, ${profile.full_name}!`
                  : 'Добро пожаловать!'}
              </h2>
              <p className={`text-sm mt-1 ${isFirstVisit ? 'text-green-50' : 'text-gray-600'}`}>
                {isFirstVisit
                  ? 'Рады, что вы с нами. Пройдите короткий обзор — или начните с создания участка.'
                  : new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        </div>

        {!digestDismissed && (
          <EmailDigestBanner
            profile={profile}
            reminders={pendingReminders}
            onDismiss={() => setDigestDismissed(true)}
          />
        )}

        {/* Погода + Лунный совет */}
        <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${prefs.lunarEnabled ? 'sm:grid-cols-2' : ''}`}>
          {weatherError ? (
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 text-center">
              <CloudRain className="w-10 h-10 text-gray-300 mx-auto" aria-hidden="true" />
              <p className="text-xs text-gray-400 mt-2">Погода не загрузилась</p>
            </div>
          ) : weather ? (
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 flex items-center gap-3">
              <img
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt="иконка погоды"
                className="w-16 sm:w-20 h-16 sm:h-20"
              />
              <div>
                <p className="text-4xl sm:text-5xl font-light">{weather.temp}°</p>
                <p className="text-sm text-gray-500 capitalize">{weather.description}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {weather.humidity}%</span>
                  <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> {weather.windSpeed} м/с</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 animate-pulse">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          )}

          {prefs.lunarEnabled && (
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 flex items-center gap-4">
              <span className="text-4xl shrink-0" role="img" aria-label={lunarAdvice.text || 'Фаза луны'}>
                {lunarAdvice.emoji || '🌙'}
              </span>
              <p className="text-sm text-gray-600 leading-relaxed">{lunarAdvice.text}</p>
            </div>
          )}
        </div>

        {/* Статистика — только на компьютере и планшете */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Мои участки" value={stats.gardens} icon={LayoutGrid} color="bg-blue-500" link="/gardens" />
          <StatCard title="Рассада" value={stats.pots} icon={Flower} color="bg-amber-500" link="/pots" />
          <StatCard title="Задачи" value={stats.tasks} icon={Calendar} color={stats.tasks > 0 ? 'bg-red-500' : 'bg-gray-400'} link="/reminders" />
          <StatCard title="Каталог" value={stats.catalog} icon={BookOpen} color="bg-green-500" link="/catalog" />
        </div>

        {/* Задачи + Быстрые действия */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span>Задачи на сегодня</span>
              </h3>
              <Link to="/reminders" className="text-sm text-green-600 hover:text-green-700 transition-colors">
                Все задачи →
              </Link>
            </div>
            
            {loadingTasks ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500">Задач на сегодня нет</p>
                <Link to="/reminders" className="inline-block mt-3 text-sm text-green-600">
                  + Создать задачу
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <TaskTypeIcon type={task.type} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      {task.plants?.name && (
                        <p className="text-xs text-gray-500 truncate">{task.plants.name}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => completeTask(task.id)}
                      disabled={completingTask === task.id}
                      className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 text-sm font-medium"
                      aria-label="Отметить как выполненное"
                    >
                      {completingTask === task.id ? (
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      ) : (
                        '✓ Готово'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              Быстрые действия
            </h3>
            <div className="space-y-2">
              <QuickLink to="/gardens?action=create" icon={<LayoutGrid className="w-5 h-5 text-green-600" />} label="Создать участок" />
              <QuickLink to="/pots?action=add" icon={<Flower className="w-5 h-5 text-amber-600" />} label="Посадить рассаду" />
              <QuickLink to="/reminders?action=add" icon={<Calendar className="w-5 h-5 text-red-600" />} label="Добавить задачу" />
              <QuickLink to="/catalog" icon={<BookOpen className="w-5 h-5 text-blue-600" />} label="Открыть каталог" />
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

function TaskTypeIcon({ type }) {
  if (type === 'watering') return <Droplets className="w-5 h-5 text-blue-500 shrink-0" aria-hidden="true" />
  if (type === 'fertilizing') return <Leaf className="w-5 h-5 text-green-600 shrink-0" aria-hidden="true" />
  return <Sprout className="w-5 h-5 text-green-500 shrink-0" aria-hidden="true" />
}

function StatCard({ title, value, icon, color, link }) {
  return (
    <Link 
      to={link} 
      className="block bg-white rounded-2xl shadow-sm p-3 sm:p-5 hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500">{title}</p>
          <p className="text-xl sm:text-3xl font-bold mt-0.5">{value}</p>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${color} rounded-xl flex items-center justify-center`}>
          {createElement(icon, { className: 'w-5 sm:w-6 h-5 sm:h-6 text-white', 'aria-hidden': 'true' })}
        </div>
      </div>
    </Link>
  )
}

function QuickLink({ to, icon, label }) {
  return (
    <Link 
      to={to} 
      className="flex items-center gap-3 p-3 sm:p-3 min-h-[52px] sm:min-h-0 bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
    >
      {icon}
      <span className="text-sm sm:text-base">{label}</span>
    </Link>
  )
}

export default App