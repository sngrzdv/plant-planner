import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { 
  User, BarChart3, Settings, Sprout, Calendar, 
  CheckCircle, TrendingUp, Clock, Save, Bell, Moon,
  LayoutGrid, Flower, Award, History, Target, Download, Mail,
  MapPin, Shield, CloudRain, Eye
} from 'lucide-react'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'
import { notificationService } from '../services/notificationService'

export default function Profile() {
  const { profile, setProfile } = useAuthStore()
  const [activeTab, setActiveTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [yearlyStats, setYearlyStats] = useState([])
  const [topPlants, setTopPlants] = useState([])
  const [monthlyActivity, setMonthlyActivity] = useState([])
  
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [city, setCity] = useState(profile?.city || '')
  const [notifications, setNotifications] = useState(profile?.notification_enabled ?? true)
  const [lunarEnabled, setLunarEnabled] = useState(true)
  const [weatherAlerts, setWeatherAlerts] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  
  useEffect(() => {
    if (activeTab === 'stats') loadStats()
  }, [activeTab])
  
  async function loadStats() {
    setLoading(true)
    try {
      const userId = profile?.id
      
      const [
        { count: gardens },
        { count: pots },
        { count: reminders },
        { count: completed },
        { count: plantsOnBeds },
        { data: yearlyData },
        { data: topPlantsData },
        { data: monthlyData }
      ] = await Promise.all([
        supabase.from('layouts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('pots').select('*', { count: 'exact', head: true }).eq('status', 'growing').eq('user_id', userId),
        supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('user_id', userId),
        supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('user_id', userId),
        supabase.from('plants_on_beds').select('*', { count: 'exact', head: true }),
        supabase.from('bed_elements').select('planted_year, plant_id, plants:plant_id(name)').eq('type', 'plant_spot').order('planted_year', { ascending: false }),
        supabase.from('bed_elements').select('plant_id, plants:plant_id(name, image_url)').eq('type', 'plant_spot'),
        supabase.from('reminders').select('due_date, status').eq('user_id', userId),
      ])
      
      setStats({
        gardens: gardens || 0,
        pots: pots || 0,
        pendingReminders: reminders || 0,
        completedReminders: completed || 0,
        plantsOnBeds: plantsOnBeds || 0,
        totalReminders: (reminders || 0) + (completed || 0),
        completionRate: (reminders || 0) + (completed || 0) > 0 
          ? Math.round(((completed || 0) / ((reminders || 0) + (completed || 0))) * 100) : 0
      })
      
      if (yearlyData) {
        const byYear = {}
        yearlyData.forEach(item => {
          const year = item.planted_year || new Date().getFullYear()
          if (!byYear[year]) byYear[year] = { year, count: 0, plants: [] }
          byYear[year].count++
          byYear[year].plants.push(item.plants?.name)
        })
        setYearlyStats(Object.values(byYear).sort((a, b) => b.year - a.year))
      }
      
      if (topPlantsData) {
        const counts = {}
        topPlantsData.forEach(item => {
          const name = item.plants?.name || 'Неизвестно'
          counts[name] = (counts[name] || 0) + 1
        })
        setTopPlants(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5))
      }
      
      if (monthlyData) {
        const byMonth = {}
        monthlyData.forEach(item => {
          const month = item.due_date?.substring(0, 7)
          if (!byMonth[month]) byMonth[month] = { month, total: 0, completed: 0 }
          byMonth[month].total++
          if (item.status === 'completed') byMonth[month].completed++
        })
        setMonthlyActivity(Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).slice(-6))
      }
      
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }
  
  async function saveProfile() {
    setSaving(true)
    const updates = {
      full_name: fullName,
      notification_enabled: notifications,
      city: city
    }
    
    if (newPassword) {
      const { error: passError } = await supabase.auth.updateUser({ password: newPassword })
      if (passError) {
        alert('Ошибка смены пароля: ' + passError.message)
        setSaving(false)
        return
      }
    }
    
    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    
    if (!error) {
      setProfile({ ...profile, ...updates })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
    setShowPasswordChange(false)
    setNewPassword('')
  }
  
  async function exportStats() {
    const data = { stats, yearlyStats, topPlants, monthlyActivity, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plant-planner-stats-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }
  
  const tabs = [
    { key: 'stats', label: 'Статистика', icon: BarChart3 },
    { key: 'profile', label: 'Профиль', icon: User },
    { key: 'settings', label: 'Настройки', icon: Settings },
  ]
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0">
      <Header />
      
      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Личный кабинет</h1>
          {activeTab === 'stats' && stats && (
            <button onClick={exportStats} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Экспорт
            </button>
          )}
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm p-1.5 mb-6 flex gap-1">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>
        
        {activeTab === 'stats' && (
          <div className="space-y-4 sm:space-y-6">
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox icon={<LayoutGrid className="w-5 h-5" />} value={stats.gardens} label="Участков" color="bg-blue-50 text-blue-600" />
                  <StatBox icon={<Sprout className="w-5 h-5" />} value={stats.plantsOnBeds} label="Растений" color="bg-green-50 text-green-600" />
                  <StatBox icon={<Flower className="w-5 h-5" />} value={stats.pots} label="Рассады" color="bg-amber-50 text-amber-600" />
                  <StatBox icon={<Calendar className="w-5 h-5" />} value={stats.totalReminders} label="Задач" color="bg-purple-50 text-purple-600" />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-600" /> Выполнение задач</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-3"><div className="bg-green-600 h-3 rounded-full transition-all" style={{ width: `${stats.completionRate}%` }} /></div>
                      <span className="text-sm font-medium">{stats.completionRate}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span>Выполнено: {stats.completedReminders}</span></div>
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" /><span>Ожидают: {stats.pendingReminders}</span></div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-amber-600" /> Топ культур</h3>
                    {topPlants.length === 0 ? <p className="text-gray-400 text-sm">Пока нет данных</p> : (
                      <div className="space-y-2">
                        {topPlants.map(([name, count], i) => (
                          <div key={name} className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-300 w-6">{i + 1}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                              <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full flex items-center px-3 text-xs text-white font-medium"
                                style={{ width: `${(count / topPlants[0][1]) * 100}%` }}>{name}</div>
                            </div>
                            <span className="text-xs text-gray-500">{count} шт.</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><History className="w-5 h-5 text-indigo-600" /> История посадок</h3>
                  {yearlyStats.length === 0 ? <p className="text-gray-400 text-sm">Пока нет истории</p> : (
                    <div className="space-y-3">
                      {yearlyStats.map(year => (
                        <div key={year.year} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center font-bold text-indigo-600">{year.year}</div>
                          <div>
                            <p className="font-medium">{year.count} растений</p>
                            <p className="text-xs text-gray-500">{year.plants.slice(0, 5).join(', ')}{year.plants.length > 5 ? '...' : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-red-600" /> Активность за 6 месяцев</h3>
                  {monthlyActivity.length === 0 ? <p className="text-gray-400 text-sm">Нет данных</p> : (
                    <div className="flex items-end gap-2 h-32">
                      {monthlyActivity.map(m => {
                        const months = ['','Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
                        const monthName = months[parseInt(m.month.split('-')[1])]
                        const maxTotal = Math.max(...monthlyActivity.map(x => x.total), 1)
                        return (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex flex-col items-center" style={{ height: 100 }}>
                              <div className="w-full bg-red-400 rounded-t" style={{ height: `${(m.total / maxTotal) * 80}%`, maxHeight: 80 }} />
                              <div className="w-full bg-green-400 rounded-t" style={{ height: `${(m.completed / maxTotal) * 80}%`, maxHeight: 80 }} />
                            </div>
                            <span className="text-[10px] text-gray-500">{monthName}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded" /> Всего</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-400 rounded" /> Выполнено</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-4 sm:p-6">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Sprout className="w-5 h-5 text-green-600" /> Рекомендации</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {stats.pendingReminders > 5 && <li>⚠️ У вас {stats.pendingReminders} задач — пора в сад!</li>}
                    {stats.gardens === 0 && <li>🌱 Создайте первый участок.</li>}
                    {stats.pots === 0 && <li>🪴 Посадите рассаду.</li>}
                    {stats.completionRate >= 80 && <li>🌟 {stats.completionRate}% задач выполнено!</li>}
                    {topPlants.length > 0 && <li>🏆 Лучшая культура: {topPlants[0][0]}</li>}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">Нет данных</div>
            )}
          </div>
        )}
        
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                <span className="text-3xl font-bold text-green-600">{(profile?.full_name || 'П')[0].toUpperCase()}</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{profile?.full_name || 'Пользователь'}</h3>
                <p className="text-sm text-gray-500">{profile?.email}</p>
                <p className="text-xs text-gray-400 mt-1">На сайте с {new Date(profile?.created_at).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20" placeholder="+7 (999) 123-45-67" />
              </div>
            </div>
            
            <div>
              <button onClick={() => setShowPasswordChange(!showPasswordChange)}
                className="text-sm text-green-600 hover:text-green-700 font-medium">
                {showPasswordChange ? 'Отменить смену пароля' : 'Сменить пароль'}
              </button>
              {showPasswordChange && (
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="mt-2 w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20"
                  placeholder="Новый пароль (минимум 6 символов)" minLength={6} />
              )}
            </div>
            
            <button onClick={saveProfile} disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium transition-colors">
              {saving ? 'Сохранение...' : saved ? '✅ Сохранено!' : <><Save className="w-4 h-4" /> Сохранить</>}
            </button>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            <div className="p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-gray-600" /> Уведомления</h3>
              <div className="space-y-4">
                <ToggleRow icon={Bell} title="Push-уведомления" desc="Напоминания о задачах в браузере"
                  enabled={notifications} onChange={async () => {
                    if (!notifications) { const granted = await notificationService.requestPermission(); if (granted) setNotifications(true) }
                    else setNotifications(false)
                  }} />
                <ToggleRow icon={Mail} title="Email-уведомления" desc="Получать письма о задачах" enabled={false} onChange={() => alert('В разработке')} />
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Sprout className="w-5 h-5 text-gray-600" /> Садоводство</h3>
              <div className="space-y-4">
                <ToggleRow icon={Moon} title="Лунный календарь" desc="Показывать рекомендации по луне" enabled={lunarEnabled} onChange={() => setLunarEnabled(!lunarEnabled)} />
                <ToggleRow icon={CloudRain} title="Погодные предупреждения" desc="Уведомления о заморозках и дожде" enabled={weatherAlerts} onChange={() => setWeatherAlerts(!weatherAlerts)} />
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-gray-600" /> Местоположение</h3>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Город для прогноза погоды</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Например: Москва" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20" />
                <p className="text-xs text-gray-400 mt-1">Оставьте пустым для автоматического определения</p>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-gray-600" /> Приватность</h3>
              <ToggleRow icon={Eye} title="Публичный профиль" desc="Показывать email другим" enabled={false} onChange={() => alert('В разработке')} />
            </div>
            
            <div className="p-4 sm:p-6">
              <button onClick={saveProfile} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium transition-colors">
                {saving ? 'Сохранение...' : saved ? '✅ Настройки сохранены!' : <><Save className="w-5 h-5" /> Сохранить все настройки</>}
              </button>
            </div>
          </div>
        )}
      </main>
      
      <MobileNav />
    </div>
  )
}

function StatBox({ icon, value, label, color }) {
  return (
    <div className={`rounded-2xl p-3 sm:p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-lg sm:text-2xl font-bold">{value}</span></div>
      <p className="text-xs sm:text-sm opacity-75">{label}</p>
    </div>
  )
}

function ToggleRow({ icon: Icon, title, desc, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-gray-500">{desc}</p>
        </div>
      </div>
      <button onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-green-600' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}