import { weatherApi } from './services/weatherApi'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import { 
  Sprout, LayoutGrid, Flower, Calendar, 
  CheckCircle, BookOpen, Moon, Droplets, Wind
} from 'lucide-react'
import Header from './components/Header'
import { getMoonData } from './utils/lunar'
import { notificationService } from './services/notificationService'

import Login from './pages/Login'
import Register from './pages/Register'
import MyGardens from './pages/MyGardens'
import GardenEditor from './pages/GardenEditor'
import PlantsCatalog from './pages/PlantsCatalog'
import PlantDetail from './pages/PlantDetail'
import Pots from './pages/Pots'
import Reminders from './pages/Reminders'
import LunarCalendar from './pages/LunarCalendar'
import AdminPanel from './pages/AdminPanel'
import MobileNav from './components/MobileNav'
import Profile from './pages/Profile'
import GardenView from './pages/GardenView'
import BedEditor from './pages/BedEditor'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
  if (!user) return <Navigate to="/login" />
  return children
}

function App() {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
          if (data) setProfile(data)
          setLoading(false)
        })
      } else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user)
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
          if (data) setProfile(data)
          setLoading(false)
        })
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Router> 
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/gardens" element={<ProtectedRoute><MyGardens /></ProtectedRoute>} />
        <Route path="/catalog" element={<ProtectedRoute><PlantsCatalog /></ProtectedRoute>} />
        <Route path="/plant/:id" element={<ProtectedRoute><PlantDetail /></ProtectedRoute>} />
        <Route path="/pots" element={<ProtectedRoute><Pots /></ProtectedRoute>} />
        <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
        <Route path="/lunar" element={<ProtectedRoute><LunarCalendar /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/garden/:id/edit" element={<ProtectedRoute><GardenEditor /></ProtectedRoute>} />
        <Route path="/garden/:id" element={<ProtectedRoute><GardenView /></ProtectedRoute>} />
        <Route path="/bed/:id/edit" element={<ProtectedRoute><BedEditor /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  )
}

function Dashboard() {
  const { profile } = useAuthStore()
  const [weather, setWeather] = useState(null)
  const [lunarAdvice, setLunarAdvice] = useState({ text: '', emoji: '🌙' })
  const [stats, setStats] = useState({ gardens: 0, pots: 0, tasks: 0, plants: 0 })
  const [todayTasks, setTodayTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(true)

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [profile?.id])

  async function loadDashboard() {
    // Погода
    try {
      const city = profile?.city || null
      const weatherData = await weatherApi.getWeather(city)
      setWeather(weatherData)
    } catch (e) {}

    // Лунный совет
    try {
      const moonData = getMoonData(new Date())
      if (moonData.type === 'new_moon' || moonData.type === 'full_moon') {
        setLunarAdvice({ text: `${moonData.phase} — отдохните.`, emoji: moonData.emoji })
      } else if (moonData.type.includes('waxing')) {
        setLunarAdvice({ text: `${moonData.phase}. Благоприятное время для посадки!`, emoji: moonData.emoji })
      } else {
        setLunarAdvice({ text: `${moonData.phase}. Хорошо для корнеплодов и полива.`, emoji: moonData.emoji })
      }
    } catch (e) {}

    // Статистика
    try {
      const [
        { count: gardens },
        { count: pots },
        { count: tasks },
        { count: plants }
      ] = await Promise.all([
        supabase.from('layouts').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id),
        supabase.from('pots').select('*', { count: 'exact', head: true }).eq('status', 'growing').eq('user_id', profile?.id),
        supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('user_id', profile?.id),
        supabase.from('plants').select('*', { count: 'exact', head: true }),
      ])
      setStats({ gardens: gardens || 0, pots: pots || 0, tasks: tasks || 0, plants: plants || 0 })
    } catch (e) {}

    // Задачи на сегодня
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('reminders')
        .select('id, title, type, plants:plant_id(name)')
        .eq('status', 'pending')
        .eq('due_date', today)
        .eq('user_id', profile?.id)
        .limit(5)
      setTodayTasks(data || [])
    } catch (e) {}

    setLoadingTasks(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <Header />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20 sm:pb-6">
        <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {profile?.full_name ? `С возвращением, ${profile.full_name.split(' ')[0]}!` : 'Добро пожаловать!'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {weather && (
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 flex items-center gap-3">
              <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="" className="w-16 sm:w-20 h-16 sm:h-20" />
              <div>
                <p className="text-4xl sm:text-5xl font-light">{weather.temp}°</p>
                <p className="text-sm text-gray-500 capitalize">{weather.description}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>💧 {weather.humidity}%</span>
                  <span>💨 {weather.windSpeed} м/с</span>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 flex items-center gap-4">
            <span className="text-4xl">{lunarAdvice.emoji}</span>
            <p className="text-sm text-gray-600">{lunarAdvice.text}</p>
          </div>
        </div>

        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Мои участки" value={stats.gardens} icon={LayoutGrid} color="bg-blue-500" link="/gardens" />
          <StatCard title="Рассада" value={stats.pots} icon={Flower} color="bg-amber-500" link="/pots" />
          <StatCard title="Задачи" value={stats.tasks} icon={Calendar} color={stats.tasks > 0 ? 'bg-red-500' : 'bg-gray-400'} link="/reminders" />
          <StatCard title="Каталог" value={stats.plants} icon={BookOpen} color="bg-green-500" link="/catalog" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-5 h-5 text-green-600" />Задачи на сегодня</h3>
              <Link to="/reminders" className="text-sm text-green-600">Все →</Link>
            </div>
            {loadingTasks ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
            : todayTasks.length === 0 ? <div className="text-center py-6"><CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" /><p className="text-gray-500">Задач нет!</p></div>
            : <div className="space-y-2">{todayTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span>{t.type === 'watering' ? '💧' : '🌱'}</span>
                <div className="flex-1"><p className="font-medium text-sm">{t.title}</p><p className="text-xs text-gray-500">{t.plants?.name}</p></div>
                <button className="text-xs text-green-600">✓</button>
              </div>
            ))}</div>}
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold mb-4">Быстрые действия</h3>
            <div className="space-y-2">
              <QuickLink to="/gardens" icon={<LayoutGrid className="w-5 h-5 text-green-600" />} label="Создать участок" />
              <QuickLink to="/pots" icon={<Flower className="w-5 h-5 text-amber-600" />} label="Посадить рассаду" />
              <QuickLink to="/reminders" icon={<Calendar className="w-5 h-5 text-red-600" />} label="Добавить задачу" />
              <QuickLink to="/catalog" icon={<BookOpen className="w-5 h-5 text-blue-600" />} label="Открыть каталог" />
              <QuickLink to="/lunar" icon={<Moon className="w-5 h-5 text-purple-600" />} label="Лунный календарь" />
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, link }) {
  return (
    <Link to={link} className="bg-white rounded-2xl shadow-sm p-3 sm:p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-0.5">{value}</p>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
        </div>
      </div>
    </Link>
  )
}

function QuickLink({ to, icon, label }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  )
}

export default App