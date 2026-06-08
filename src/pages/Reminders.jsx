import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { 
  Calendar, CheckCircle, Circle, Droplets, Sprout, 
  Scissors, AlertCircle, ChevronLeft, ChevronRight,
  Plus, X, Clock, Trash2, TrendingUp, Sparkles,
  Flower2
} from 'lucide-react'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'
import PlantImage from '../components/PlantImage'
import { notificationService } from '../services/notificationService'
import { confirm } from '../store/confirmStore'
import { useReferenceStore } from '../store/referenceStore'

function formatLoadError(error) {
  const message = error?.message || String(error || '')
  if (/permission denied/i.test(message) || error?.code === '42501') {
    return 'Нет доступа к таблице reminders. Выполните SQL из файла supabase/reminders_rls.sql в Supabase Dashboard.'
  }
  return message || 'Не удалось загрузить задачи'
}

const COLUMNS = [
  { id: 'overdue', title: 'Просрочено', color: 'from-red-100 to-red-50', border: 'border-red-200', icon: AlertCircle },
  { id: 'today', title: 'Сегодня', color: 'from-amber-100 to-amber-50', border: 'border-amber-200', icon: Clock },
  { id: 'upcoming', title: 'Предстоит', color: 'from-blue-100 to-blue-50', border: 'border-blue-200', icon: Calendar },
  { id: 'completed', title: 'Выполнено', color: 'from-green-100 to-emerald-50', border: 'border-green-200', icon: CheckCircle },
]

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

// Лунные фазы
function getMoonEmoji(date) {
  const knownNewMoon = new Date(2024, 0, 11)
  const diffDays = Math.floor((date - knownNewMoon) / (1000 * 60 * 60 * 24))
  const phase = diffDays % 29.53
  
  if (phase < 1) return '🌑'
  if (phase < 7) return '🌒'
  if (phase < 8) return '🌓'
  if (phase < 14) return '🌔'
  if (phase < 15) return '🌕'
  if (phase < 22) return '🌖'
  if (phase < 23) return '🌗'
  return '🌘'
}

export default function Reminders() {
  const { user } = useAuthStore()
  const [reminders, setReminders] = useState([])
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [view, setView] = useState('board')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  
  // Календарь
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  
  const [newTask, setNewTask] = useState({
    title: '', type: 'watering', due_date: new Date().toISOString().split('T')[0], plant_id: '', repeat_days: 0
  })
  const [addingTask, setAddingTask] = useState(false)

  const loadReminders = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? user.id

      const { data, error } = await supabase
        .from('reminders')
        .select('id, user_id, title, type, due_date, status, plant_id, source, created_at')
        .eq('user_id', userId)
        .order('due_date', { ascending: true })

      if (error) {
        console.error('Reminders load error:', error)
        setLoadError(formatLoadError(error))
        setReminders([])
        return
      }

      const rows = data || []
      setReminders(rows.map((reminder) => ({ ...reminder, plants: null })))

      if (!rows.length) return

      void useReferenceStore.getState().getPlants().then((plantsList) => {
        const plantById = new Map((plantsList || []).map((plant) => [plant.id, plant]))
        setReminders((current) =>
          current.map((reminder) => ({
            ...reminder,
            plants: reminder.plant_id ? plantById.get(reminder.plant_id) || null : null,
          }))
        )
      })
    } catch (err) {
      console.error('Reminders load error:', err)
      setLoadError(formatLoadError(err))
      setReminders([])
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadPlants = useCallback(async () => {
    const data = await useReferenceStore.getState().getPlants()
    setPlants(data || [])
  }, [])

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReminders()
  }, [loadReminders])

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (showAddModal) loadPlants() 
  }, [showAddModal, loadPlants])

  async function completeReminder(id) {
    const { error } = await supabase.from('reminders').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) {
      notificationService.error('Не удалось выполнить задачу')
      return
    }
    setReminders(rs => rs.map(r => r.id === id ? { ...r, status: 'completed' } : r))
    notificationService.success('Задача выполнена! 🎉')
  }

  async function skipReminder(id) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const { error } = await supabase.from('reminders').update({ due_date: tomorrow.toISOString().split('T')[0] }).eq('id', id)
    if (error) {
      notificationService.error('Не удалось перенести задачу')
      return
    }
    loadReminders()
    notificationService.info('Задача перенесена на завтра')
  }

  async function deleteReminder(id) {
    const ok = await confirm('Удалить задачу? Это действие нельзя отменить.', {
      title: 'Удалить задачу',
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from('reminders').delete().eq('id', id)
      if (error) throw error
      setReminders(rs => rs.filter(r => r.id !== id))
      notificationService.success('Задача удалена')
    } catch {
      notificationService.error('Не удалось удалить')
    } finally {
      setDeletingId(null)
    }
  }

  async function addReminder() {
    if (!newTask.title.trim()) {
      notificationService.error('Введите название задачи')
      return
    }
    
    setAddingTask(true)
    
    try {
      const tasks = [{ 
        user_id: user.id, 
        title: newTask.title.trim(), 
        type: newTask.type, 
        due_date: newTask.due_date, 
        plant_id: newTask.plant_id || null, 
        status: 'pending', 
        source: 'user' 
      }]
      
      if (newTask.repeat_days > 0) {
        for (let i = 1; i <= 10; i++) {
          const d = new Date(newTask.due_date)
          d.setDate(d.getDate() + i * newTask.repeat_days)
          tasks.push({ 
            user_id: user.id, 
            title: newTask.title.trim(), 
            type: newTask.type, 
            due_date: d.toISOString().split('T')[0], 
            plant_id: newTask.plant_id || null, 
            status: 'pending', 
            source: 'user' 
          })
        }
      }

      notificationService.send('Новая задача', {
        body: `Задача "${newTask.title}" добавлена на ${newTask.due_date}`,
        tag: 'new-task',
      })
      
      const { error } = await supabase.from('reminders').insert(tasks)
      if (error) throw error
      setShowAddModal(false)
      setNewTask({ 
        title: '', 
        type: 'watering', 
        due_date: new Date().toISOString().split('T')[0], 
        plant_id: '', 
        repeat_days: 0 
      })
      loadReminders()
      notificationService.success('Задача добавлена!')
    } catch (e) {
      console.error('Error adding reminder:', e)
      notificationService.error('Не удалось добавить задачу')
    } finally {
      setAddingTask(false)
    }
  }

  function getIcon(type, className = "w-4 h-4") {
    switch (type) {
      case 'watering': return <Droplets className={`${className} text-blue-500`} />
      case 'harvest': return <Scissors className={`${className} text-amber-500`} />
      case 'transplant': return <Sprout className={`${className} text-green-500`} />
      case 'fertilizing': return <Sparkles className={`${className} text-purple-500`} />
      default: return <Calendar className={`${className} text-gray-500`} />
    }
  }

  const today = new Date().toISOString().split('T')[0]
  
  const groupedByStatus = {
    overdue: reminders.filter(r => r.status === 'pending' && r.due_date < today),
    today: reminders.filter(r => r.status === 'pending' && r.due_date === today),
    upcoming: reminders.filter(r => r.status === 'pending' && r.due_date > today),
    completed: reminders.filter(r => r.status === 'completed'),
  }

  const stats = {
    total: reminders.length,
    completed: groupedByStatus.completed.length,
    pending: reminders.filter(r => r.status === 'pending').length,
    overdue: groupedByStatus.overdue.length,
    completionRate: reminders.length > 0 ? Math.round((groupedByStatus.completed.length / reminders.length) * 100) : 0
  }

  // Красивая сетка календаря
  function getCalendarDays() {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const firstDay = new Date(calYear, calMonth, 1).getDay() || 7
    const grid = []
    
    for (let i = 1; i < firstDay; i++) grid.push(null)
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayReminders = reminders.filter(r => r.due_date === dateStr)
      const pending = dayReminders.filter(r => r.status === 'pending').length
      const completed = dayReminders.filter(r => r.status === 'completed').length
      const date = new Date(calYear, calMonth, d)
      const moonEmoji = getMoonEmoji(date)
      
      grid.push({
        day: d,
        date: dateStr,
        fullDate: date,
        reminders: dayReminders,
        pending,
        completed,
        isToday: dateStr === today,
        moonEmoji: moonEmoji
      })
    }
    return grid
  }

  const calendarDays = getCalendarDays()
  const selectedDayReminders = selectedDate 
    ? reminders.filter(r => r.due_date === selectedDate)
    : []

  function getPlantTimeline(plant) {
    if (!plant?.maturation_days) return []
    return [
      { name: 'Посев', day: 0, emoji: '🌰', color: '#8B5A2B' },
      { name: 'Всходы', day: Math.round(plant.maturation_days * 0.1), emoji: '🌱', color: '#22C55E' },
      { name: 'Рост', day: Math.round(plant.maturation_days * 0.35), emoji: '🌿', color: '#16A34A' },
      { name: 'Цветение', day: Math.round(plant.maturation_days * 0.6), emoji: '🌸', color: '#EC4899' },
      { name: 'Плоды', day: Math.round(plant.maturation_days * 0.8), emoji: '🍅', color: '#F59E0B' },
      { name: 'Урожай', day: plant.maturation_days, emoji: '🧺', color: '#EF4444' },
    ]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0">
        <Header />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Загружаем задачи...</p>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0">
      <Header />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        {loadError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-red-700 flex-1">
              {loadError}
              {/permission denied/i.test(loadError) && (
                <span className="block mt-1 text-red-600">
                  Нужно добавить RLS-политику для таблицы reminders в Supabase (SQL ниже в инструкции).
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={loadReminders}
              className="text-sm font-medium text-red-700 hover:text-red-800 underline shrink-0"
            >
              Повторить
            </button>
          </div>
        )}
        
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
              <Calendar className="w-6 h-6 text-green-600" />
              Умный календарь ухода
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {stats.overdue > 0 ? `⚠️ ${stats.overdue} просроченных задач` : '🌿 Все задачи в порядке'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1">
              {[
                { id: 'board', label: 'Доска', icon: '📋' },
                { id: 'calendar', label: 'Календарь', icon: '📅' },
              ].map(v => (
                <button 
                  key={v.id} 
                  onClick={() => setView(v.id)} 
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                    view === v.id ? 'bg-white shadow-lg text-green-700' : 'text-gray-500'
                  }`}
                >
                  {v.icon} <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setShowAddModal(true)} 
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium min-h-[44px] shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Добавить</span>
            </button>
          </div>
        </div>

        {!loadError && reminders.length === 0 && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50/80 p-6 sm:p-8 text-center">
            <span className="text-4xl block mb-3" aria-hidden="true">📋</span>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Пока нет задач</h2>
            <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
              Добавьте напоминание вручную или посадите растение на участке — задачи по поливу появятся автоматически.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Добавить задачу
            </button>
          </div>
        )}

        {/* Статистика */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
          {COLUMNS.map(col => {
            const count = col.id === 'completed' ? stats.completed : col.id === 'overdue' ? stats.overdue : col.id === 'today' ? groupedByStatus.today.length : groupedByStatus.upcoming.length
            return (
              <div 
                key={col.id} 
                className={`bg-gradient-to-br ${col.color} rounded-xl p-2 sm:p-3 text-center border ${col.border} transition-all hover:scale-105 cursor-pointer`}
                onClick={() => {
                  if (col.id === 'today') setView('board')
                }}
              >
                <col.icon className="w-4 h-4 mx-auto mb-1 opacity-60" />
                <p className="text-xl sm:text-2xl font-bold">{count}</p>
                <p className="text-[10px] sm:text-xs text-gray-600">{col.title}</p>
              </div>
            )
          })}
        </div>

        {/* Доска задач - последние 10 в каждом столбце */}
        {view === 'board' && (
          <div className="overflow-x-auto pb-2 -mx-3 px-3">
            <div className="grid grid-cols-4 gap-3 min-w-[600px] sm:min-w-0">
              {COLUMNS.map(col => {
                let items = []
                if (col.id === 'overdue') items = groupedByStatus.overdue.slice(0, 10)
                if (col.id === 'today') items = groupedByStatus.today.slice(0, 10)
                if (col.id === 'upcoming') items = groupedByStatus.upcoming.slice(0, 10)
                if (col.id === 'completed') items = groupedByStatus.completed.slice(0, 10)
                
                return (
                  <div key={col.id} className={`bg-gradient-to-br ${col.color} rounded-2xl p-3 border ${col.border} shadow-sm`}>
                    <div className="flex items-center gap-2 mb-3">
                      <col.icon className="w-4 h-4" />
                      <h3 className="font-semibold text-sm">{col.title}</h3>
                      <span className="ml-auto text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
                        {items.length} / {col.id === 'overdue' ? groupedByStatus.overdue.length : 
                          col.id === 'today' ? groupedByStatus.today.length : 
                          col.id === 'upcoming' ? groupedByStatus.upcoming.length : 
                          groupedByStatus.completed.length}
                      </span>
                    </div>
                    
                    <div className="space-y-2 min-h-[100px]">
                      {items.map(r => (
                        <div 
                          key={r.id} 
                          className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                        >
                          <div className="flex items-center gap-2">
                            {getIcon(r.type)}
                            <span className="text-sm font-medium truncate flex-1">{r.title}</span>
                          </div>
                          {r.plants && (
                            <div 
                              className="flex items-center gap-1.5 mt-2 cursor-pointer" 
                              onClick={() => { setSelectedReminder(r); setShowTimeline(true); }}
                            >
                              <PlantImage
                                src={r.plants.image_url}
                                alt={r.plants.name}
                                className="w-5 h-5 rounded-full object-cover"
                                fallbackClassName="w-5 h-5 rounded-full"
                                compact
                              />
                              <span className="text-xs text-gray-500">{r.plants.name}</span>
                            </div>
                          )}
                          
                          {/* Кнопки в зависимости от столбца */}
                          {col.id === 'overdue' && (
                            <div className="flex gap-2 mt-3">
                              <button 
                                onClick={() => completeReminder(r.id)} 
                                className="flex-1 text-xs bg-green-100 text-green-700 px-2 py-2 rounded-lg hover:bg-green-200 transition-all min-h-[36px] font-medium"
                              >
                                ✓ Готово
                              </button>
                              <button 
                                onClick={() => deleteReminder(r.id)} 
                                disabled={deletingId === r.id}
                                className="text-xs bg-red-50 text-red-500 px-2 py-2 rounded-lg hover:bg-red-100 transition-all min-h-[36px] disabled:opacity-50"
                              >
                                {deletingId === r.id ? '...' : '✕ Удалить'}
                              </button>
                            </div>
                          )}
                          
                          {col.id === 'today' && (
                            <div className="flex gap-2 mt-3">
                              <button 
                                onClick={() => completeReminder(r.id)} 
                                className="flex-1 text-xs bg-green-100 text-green-700 px-2 py-2 rounded-lg hover:bg-green-200 transition-all min-h-[36px] font-medium"
                              >
                                ✓ Готово
                              </button>
                              <button 
                                onClick={() => skipReminder(r.id)} 
                                className="flex-1 text-xs bg-gray-100 text-gray-600 px-2 py-2 rounded-lg hover:bg-gray-200 transition-all min-h-[36px]"
                              >
                                → Завтра
                              </button>
                              <button 
                                onClick={() => deleteReminder(r.id)} 
                                disabled={deletingId === r.id}
                                className="text-xs bg-red-50 text-red-500 px-2 py-2 rounded-lg hover:bg-red-100 transition-all min-h-[36px] disabled:opacity-50"
                              >
                                {deletingId === r.id ? '...' : '✕'}
                              </button>
                            </div>
                          )}
                          
                          {col.id === 'upcoming' && (
                            <div className="flex gap-2 mt-3">
                              <button 
                                onClick={() => deleteReminder(r.id)} 
                                disabled={deletingId === r.id}
                                className="w-full text-xs bg-red-50 text-red-500 px-2 py-2 rounded-lg hover:bg-red-100 transition-all min-h-[36px] disabled:opacity-50"
                              >
                                {deletingId === r.id ? '...' : '✕ Удалить'}
                              </button>
                            </div>
                          )}
                          
                          {col.id === 'completed' && (
                            <div className="flex gap-2 mt-3">
                              <button 
                                onClick={() => deleteReminder(r.id)} 
                                disabled={deletingId === r.id}
                                className="w-full text-xs bg-gray-100 text-gray-500 px-2 py-2 rounded-lg hover:bg-gray-200 transition-all min-h-[36px] disabled:opacity-50"
                              >
                                {deletingId === r.id ? '...' : '🗑 Удалить'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {items.length === 0 && (
                        <div className="text-center py-6">
                          <Flower2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">Пусто</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* КРАСИВЫЙ КАЛЕНДАРЬ с лунными фазами */}
        {view === 'calendar' && (
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            <div className="flex-1">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                
                {/* Заголовок месяца */}
                <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white px-4 py-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => { 
                        if (calMonth === 0) { 
                          setCalMonth(11); 
                          setCalYear(y => y - 1) 
                        } else { 
                          setCalMonth(m => m - 1) 
                        } 
                      }} 
                      className="p-2 hover:bg-white/20 rounded-xl transition-all min-w-[44px] min-h-[44px]"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                      <h2 className="text-xl font-bold">{MONTHS[calMonth]}</h2>
                      <p className="text-sm text-white/70">{calYear}</p>
                    </div>
                    <button 
                      onClick={() => { 
                        if (calMonth === 11) { 
                          setCalMonth(0); 
                          setCalYear(y => y + 1) 
                        } else { 
                          setCalMonth(m => m + 1) 
                        } 
                      }} 
                      className="p-2 hover:bg-white/20 rounded-xl transition-all min-w-[44px] min-h-[44px]"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Дни недели */}
                <div className="grid grid-cols-7 border-b bg-gray-50">
                  {DAYS.map(d => (
                    <div key={d} className="p-3 text-center text-sm font-semibold text-gray-600">
                      {d}
                    </div>
                  ))}
                </div>
                
                {/* Дни месяца с луной */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((item, i) => {
                    if (!item) return <div key={`e${i}`} className="p-2 border-r border-b min-h-[100px] bg-gray-50/30" />
                    
                    const isSelected = item.date === selectedDate
                    
                    return (
                      <div 
                        key={item.date} 
                        onClick={() => setSelectedDate(item.date)}
                        className={`p-2 border-r border-b cursor-pointer transition-all duration-300 min-h-[100px] hover:shadow-inner ${
                          isSelected ? 'bg-gradient-to-br from-green-50 to-emerald-50 ring-2 ring-green-400 ring-inset' : ''
                        } ${item.isToday ? 'bg-amber-50/50' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium w-7 h-7 rounded-full flex items-center justify-center ${
                            item.isToday ? 'bg-amber-500 text-white shadow-md' : ''
                          }`}>
                            {item.day}
                          </span>
                          <span className="text-xl" title="Лунная фаза">{item.moonEmoji}</span>
                        </div>
                        
                        <div className="space-y-1 mt-2">
                          {item.pending > 0 && (
                            <div className="flex items-center gap-1 text-xs bg-red-100 rounded-full px-2 py-0.5 inline-flex">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                              <span className="text-red-600">{item.pending} задач</span>
                            </div>
                          )}
                          {item.completed > 0 && (
                            <div className="flex items-center gap-1 text-xs bg-green-100 rounded-full px-2 py-0.5 inline-flex mt-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span className="text-green-600">{item.completed} готово</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* Боковая панель дня */}
            <div className="lg:w-96">
              {selectedDate ? (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-4">
                    <div>
                      <p className="text-sm text-white/80">Выбранный день</p>
                      <h3 className="text-lg font-bold">
                        {new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-500">{selectedDayReminders.length} задач</p>
                      <button 
                        onClick={() => setShowAddModal(true)}
                        className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        + Добавить
                      </button>
                    </div>
                    
                    {selectedDayReminders.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Flower2 className="w-8 h-8 text-green-400" />
                        </div>
                        <p className="text-gray-400 text-sm">Нет задач на этот день</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {selectedDayReminders.map(r => (
                          <div 
                            key={r.id} 
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                              r.status === 'completed' ? 'bg-gray-50 opacity-60' : 
                              r.due_date < today ? 'bg-red-50 border-l-4 border-red-400' : 
                              r.due_date === today ? 'bg-amber-50 border-l-4 border-amber-400' : 'bg-gray-50'
                            }`}
                          >
                            <button 
                              onClick={() => completeReminder(r.id)} 
                              disabled={r.status === 'completed'}
                              className="min-w-[36px] min-h-[36px] flex items-center justify-center"
                            >
                              {r.status === 'completed' ? 
                                <CheckCircle className="w-5 h-5 text-green-500" /> : 
                                <Circle className="w-5 h-5 text-gray-300 hover:text-green-500 transition-colors" />
                              }
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {getIcon(r.type, "w-4 h-4")}
                                <span className={`text-sm truncate ${r.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                                  {r.title}
                                </span>
                              </div>
                              {r.plants && (
                                <p className="text-xs text-gray-500 ml-6 truncate">{r.plants.name}</p>
                              )}
                            </div>
                            <button 
                              onClick={() => deleteReminder(r.id)} 
                              className="p-2 text-gray-300 hover:text-red-500 min-w-[36px] min-h-[36px] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-10 h-10 text-green-600" />
                  </div>
                  <p className="text-gray-600 font-medium">Выберите день</p>
                  <p className="text-sm text-gray-400 mt-1">Нажмите на любую дату в календаре</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Шкала жизни растения */}
        {showTimeline && selectedReminder?.plants && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowTimeline(false); setSelectedReminder(null); }}>
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <PlantImage
                      src={selectedReminder.plants.image_url}
                      alt={selectedReminder.plants.name}
                      className="w-14 h-14 rounded-2xl object-cover shadow-md"
                      fallbackClassName="w-14 h-14 rounded-2xl shadow-md"
                      compact
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedReminder.plants.name}</h3>
                    <p className="text-sm text-gray-500">Созревание: {selectedReminder.plants.maturation_days} дней</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowTimeline(false); setSelectedReminder(null); }} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-all min-w-[44px] min-h-[44px]"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="relative mt-6 mb-8">
                <div className="absolute top-5 left-0 right-0 h-2 bg-gray-100 rounded-full" />
                <div className="relative flex justify-between overflow-x-auto pb-4">
                  {getPlantTimeline(selectedReminder.plants).map((stage, i) => (
                    <div key={i} className="flex flex-col items-center min-w-[70px] group">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md transition-all group-hover:scale-110"
                        style={{ backgroundColor: stage.color + '20', border: `2px solid ${stage.color}` }}
                      >
                        {stage.emoji}
                      </div>
                      <p className="text-xs font-semibold mt-2 text-gray-700">{stage.name}</p>
                      <p className="text-xs text-gray-400">{stage.day} дн.</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <h4 className="font-semibold text-sm mb-3">📋 Связанные задачи</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {reminders.filter(r => r.plant_id === selectedReminder.plant_id).slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-sm py-2 px-2 bg-gray-50 rounded-xl">
                      {getIcon(r.type)}
                      <span className="flex-1 truncate">{r.title}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(r.due_date).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <MobileNav />

      {/* Модальное окно добавления задачи */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="text-xl font-bold">Новая задача</h2>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-all min-w-[44px] min-h-[44px]"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Что нужно сделать?" 
                value={newTask.title} 
                onChange={e => setNewTask({...newTask, title: e.target.value})} 
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all"
                autoFocus 
              />
              
              <select 
                value={newTask.type} 
                onChange={e => setNewTask({...newTask, type: e.target.value})} 
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all bg-white"
              >
                <option value="watering">💧 Полив</option>
                <option value="fertilizing">✨ Подкормка</option>
                <option value="transplant">🌱 Пересадка</option>
                <option value="harvest">✂️ Сбор урожая</option>
                <option value="custom">📝 Другое</option>
              </select>
              
              <input 
                type="date" 
                value={newTask.due_date} 
                onChange={e => setNewTask({...newTask, due_date: e.target.value})} 
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all"
              />
              
              <select 
                value={newTask.plant_id} 
                onChange={e => setNewTask({...newTask, plant_id: e.target.value})} 
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all bg-white"
              >
                <option value="">🌿 Без растения</option>
                {plants.map(p => <option key={p.id} value={p.id}>🌱 {p.name}</option>)}
              </select>
              
              <div>
                <label className="block text-sm text-gray-500 mb-2">Повторять каждые</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min="0" 
                    max="90" 
                    placeholder="0"
                    value={newTask.repeat_days} 
                    onChange={e => setNewTask({...newTask, repeat_days: parseInt(e.target.value) || 0})} 
                    className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all"
                  />
                  <span className="text-gray-500 text-sm flex items-center">дней</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">0 — без повтора</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={addReminder} 
                disabled={addingTask}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 font-medium disabled:opacity-50 transition-all shadow-md"
              >
                {addingTask ? 'Добавление...' : 'Добавить'}
              </button>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}