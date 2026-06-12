import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { 
  Calendar, CheckCircle, Circle, Droplets, Sprout, 
  Scissors, AlertCircle, ChevronLeft, ChevronRight,
  Plus, X, Clock, Trash2, TrendingUp, Sparkles,
  Flower2, LayoutList, ClipboardList
} from 'lucide-react'
import { TASK_TYPE_LABELS } from '../lib/plantLabels'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'
import PlantImage from '../components/PlantImage'
import { notificationService } from '../services/notificationService'
import { reminderService } from '../services/reminderService'
import { confirm } from '../store/confirmStore'
import { useReferenceStore } from '../store/referenceStore'
import { fetchBoardReminders, attachPlantsToReminders } from '../services/remindersBoardService'

function isPendingReminder(reminder) {
  return !reminder.status || reminder.status === 'pending'
}

function isTransientFetchError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return /failed to fetch|network|chunked|aborted|timeout/.test(message)
}

async function fetchRemindersWithRetry(userId) {
  let lastError = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await fetchBoardReminders(userId)
    if (!result.error) return result
    lastError = result.error
    if (!isTransientFetchError(result.error) || attempt === 1) break
    await delay(300)
  }
  return { data: null, error: lastError }
}

function buildRemindersByDate(reminders) {
  const map = new Map()
  for (const reminder of reminders) {
    const bucket = map.get(reminder.due_date)
    if (bucket) bucket.push(reminder)
    else map.set(reminder.due_date, [reminder])
  }
  return map
}

function buildCalendarDays(calYear, calMonth, today, remindersByDate) {
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay() || 7
  const grid = []

  for (let i = 1; i < firstDay; i++) grid.push(null)

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayReminders = remindersByDate.get(dateStr) || []
    const pending = dayReminders.filter(isPendingReminder).length
    const completed = dayReminders.filter((r) => r.status === 'completed').length
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
      moonEmoji,
    })
  }
  return grid
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatLoadError(error) {
  const message = error?.message || String(error || '')
  if (/permission denied/i.test(message) || error?.code === '42501') {
    return 'Нет доступа к таблице reminders. Выполните SQL из файла supabase/reminders_rls.sql в Supabase Dashboard.'
  }
  if (/failed to fetch|network|chunked/i.test(message)) {
    return 'Сбой сети при загрузке задач. Проверьте интернет и нажмите «Повторить».'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  const [reminders, setReminders] = useState([])
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [view, setView] = useState('board')
  const [boardColumn, setBoardColumn] = useState('today')
  const boardTabInitialized = useRef(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [completingId, setCompletingId] = useState(null)
  const [bulkDayAction, setBulkDayAction] = useState(false)
  
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
      const userId = user.id

      const [{ data, error }, plantsList] = await Promise.all([
        fetchRemindersWithRetry(userId),
        useReferenceStore.getState().getPlants().catch(() => []),
      ])

      if (error) {
        console.error('Reminders load error:', error)
        setLoadError(formatLoadError(error))
        setReminders([])
        return
      }

      setReminders(attachPlantsToReminders(data || [], plantsList))
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

  useEffect(() => {
    if (searchParams.get('action') !== 'add') return
    setShowAddModal(true)
    const next = new URLSearchParams(searchParams)
    next.delete('action')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  async function completeReminder(id) {
    if (completingId) return

    setCompletingId(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? user?.id
      const result = await reminderService.completeReminder(userId, id)

      if (!result.ok) {
        console.error('Complete reminder error:', result.error)
        notificationService.error(result.error?.message || 'Не удалось выполнить задачу')
        return
      }

      setReminders((rows) =>
        rows.map((row) =>
          row.id === id
            ? {
                ...row,
                status: 'completed',
                completed_at: result.data?.completed_at || new Date().toISOString(),
              }
            : row
        )
      )
      notificationService.success('Задача выполнена')
    } finally {
      setCompletingId(null)
    }
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

  async function uncompleteReminder(id) {
    if (completingId) return

    setCompletingId(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? user?.id
      const result = await reminderService.uncompleteReminder(userId, id)

      if (!result.ok) {
        notificationService.error(result.error?.message || 'Не удалось вернуть задачу')
        return
      }

      setReminders((rows) =>
        rows.map((row) =>
          row.id === id
            ? { ...row, status: 'pending', completed_at: null }
            : row
        )
      )
      notificationService.info('Задача снова активна')
    } finally {
      setCompletingId(null)
    }
  }

  async function toggleReminderComplete(reminder) {
    if (reminder.status === 'completed') {
      await uncompleteReminder(reminder.id)
    } else {
      await completeReminder(reminder.id)
    }
  }

  async function deleteReminder(id) {
    const target = reminders.find((r) => r.id === id)
    if (target?.status === 'completed') {
      notificationService.error('Выполненные задачи удалить нельзя')
      return
    }
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

  async function completeAllSelectedDay() {
    const pending = selectedDayReminders.filter((r) => r.status !== 'completed')
    if (pending.length === 0) return
    setBulkDayAction(true)
    try {
      const completedAt = new Date().toISOString()
      const ids = pending.map((r) => r.id)
      const { error } = await supabase
        .from('reminders')
        .update({ status: 'completed', completed_at: completedAt })
        .in('id', ids)
        .eq('user_id', user.id)
      if (error) throw error
      setReminders((rows) =>
        rows.map((row) =>
          ids.includes(row.id) ? { ...row, status: 'completed', completed_at: completedAt } : row
        )
      )
      notificationService.success(`Отмечено выполненными: ${ids.length}`)
    } catch {
      notificationService.error('Не удалось отметить все задачи')
    } finally {
      setBulkDayAction(false)
    }
  }

  async function uncompleteAllSelectedDay() {
    const done = selectedDayReminders.filter((r) => r.status === 'completed')
    if (done.length === 0) return
    setBulkDayAction(true)
    try {
      const ids = done.map((r) => r.id)
      const { error } = await supabase
        .from('reminders')
        .update({ status: 'pending', completed_at: null })
        .in('id', ids)
        .eq('user_id', user.id)
      if (error) throw error
      setReminders((rows) =>
        rows.map((row) =>
          ids.includes(row.id) ? { ...row, status: 'pending', completed_at: null } : row
        )
      )
      notificationService.info(`Возвращено в активные: ${ids.length}`)
    } catch {
      notificationService.error('Не удалось вернуть задачи')
    } finally {
      setBulkDayAction(false)
    }
  }

  async function deleteAllPendingSelectedDay() {
    const pending = selectedDayReminders.filter((r) => r.status !== 'completed')
    if (pending.length === 0) return
    const ok = await confirm(
      `Удалить все невыполненные задачи на этот день (${pending.length})?`,
      { title: 'Удалить задачи', confirmLabel: 'Удалить все', destructive: true },
    )
    if (!ok) return
    setBulkDayAction(true)
    try {
      const ids = pending.map((r) => r.id)
      const { error } = await supabase.from('reminders').delete().in('id', ids).eq('user_id', user.id)
      if (error) throw error
      setReminders((rows) => rows.filter((row) => !ids.includes(row.id)))
      notificationService.success(`Удалено: ${ids.length}`)
    } catch {
      notificationService.error('Не удалось удалить задачи')
    } finally {
      setBulkDayAction(false)
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

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  useEffect(() => {
    if (loading || boardTabInitialized.current) return
    boardTabInitialized.current = true
    const overdue = reminders.filter(r => isPendingReminder(r) && r.due_date < today)
    const todayTasks = reminders.filter(r => isPendingReminder(r) && r.due_date === today)
    if (overdue.length) setBoardColumn('overdue')
    else if (todayTasks.length) setBoardColumn('today')
  }, [loading, reminders, today])

  useEffect(() => {
    if (view !== 'calendar') return
    setSelectedDate((current) => current || today)
  }, [view, today])

  const groupedByStatus = useMemo(() => ({
    overdue: reminders.filter((r) => isPendingReminder(r) && r.due_date < today),
    today: reminders.filter((r) => isPendingReminder(r) && r.due_date === today),
    upcoming: reminders.filter((r) => isPendingReminder(r) && r.due_date > today),
    completed: reminders.filter((r) => r.status === 'completed'),
  }), [reminders, today])

  const remindersByDate = useMemo(() => buildRemindersByDate(reminders), [reminders])

  const stats = useMemo(() => ({
    total: reminders.length,
    completed: groupedByStatus.completed.length,
    pending: reminders.filter(isPendingReminder).length,
    overdue: groupedByStatus.overdue.length,
    completionRate: reminders.length > 0
      ? Math.round((groupedByStatus.completed.length / reminders.length) * 100)
      : 0,
  }), [reminders, groupedByStatus])

  const calendarDays = useMemo(
    () => buildCalendarDays(calYear, calMonth, today, remindersByDate),
    [calYear, calMonth, today, remindersByDate],
  )

  const selectedDayReminders = useMemo(
    () => (selectedDate ? remindersByDate.get(selectedDate) || [] : []),
    [selectedDate, remindersByDate],
  )

  function getColumnItems(columnId, limit = 10) {
    const all = groupedByStatus[columnId] || []
    return limit ? all.slice(0, limit) : all
  }

  function getColumnTotal(columnId) {
    return groupedByStatus[columnId]?.length || 0
  }

  function renderBoardTaskCard(r, columnId) {
    return (
      <div
        key={r.id}
        className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-2">
          {getIcon(r.type)}
          <span className="text-sm font-medium truncate flex-1">{r.title}</span>
          {columnId !== 'completed' && (
            <span className="text-[10px] text-gray-400 shrink-0">
              {new Date(r.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        {r.plants && (
          <div
            className="flex items-center gap-1.5 mt-2 cursor-pointer"
            onClick={() => { setSelectedReminder(r); setShowTimeline(true) }}
          >
            <PlantImage
              src={r.plants.image_url}
              alt={r.plants.name}
              size="thumb"
              className="w-5 h-5 rounded-full object-cover"
              fallbackClassName="w-5 h-5 rounded-full"
              compact
            />
            <span className="text-xs text-gray-500">{r.plants.name}</span>
          </div>
        )}

        {columnId === 'overdue' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => completeReminder(r.id)}
              disabled={completingId === r.id}
              className="flex-1 text-xs bg-green-100 text-green-700 px-2 py-2 rounded-lg hover:bg-green-200 transition-all min-h-[36px] font-medium disabled:opacity-50"
            >
              {completingId === r.id ? '...' : '✓ Готово'}
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

        {columnId === 'today' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => completeReminder(r.id)}
              disabled={completingId === r.id}
              className="flex-1 text-xs bg-green-100 text-green-700 px-2 py-2 rounded-lg hover:bg-green-200 transition-all min-h-[36px] font-medium disabled:opacity-50"
            >
              {completingId === r.id ? '...' : '✓ Готово'}
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

        {columnId === 'upcoming' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => completeReminder(r.id)}
              disabled={completingId === r.id}
              className="flex-1 text-xs bg-green-100 text-green-700 px-2 py-2 rounded-lg hover:bg-green-200 transition-all min-h-[36px] font-medium disabled:opacity-50"
            >
              {completingId === r.id ? '...' : '✓ Готово'}
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

        {columnId === 'completed' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => uncompleteReminder(r.id)}
              disabled={completingId === r.id}
              className="w-full text-xs bg-amber-50 text-amber-700 px-2 py-2 rounded-lg hover:bg-amber-100 transition-all min-h-[36px] disabled:opacity-50"
            >
              {completingId === r.id ? '...' : '↩ Не выполнено'}
            </button>
          </div>
        )}
      </div>
    )
  }

  function getPlantTimeline(plant) {
    if (!plant?.maturation_days) return []
    return [
      { name: 'Посев', day: 0, color: '#8B5A2B' },
      { name: 'Всходы', day: Math.round(plant.maturation_days * 0.1), color: '#22C55E' },
      { name: 'Рост', day: Math.round(plant.maturation_days * 0.35), color: '#16A34A' },
      { name: 'Цветение', day: Math.round(plant.maturation_days * 0.6), color: '#EC4899' },
      { name: 'Плоды', day: Math.round(plant.maturation_days * 0.8), color: '#F59E0B' },
      { name: 'Урожай', day: plant.maturation_days, color: '#EF4444' },
    ]
  }

  if (loading) {
    return (
      <div className="page-shell min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0 overflow-x-hidden">
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
    <div className="page-shell min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0 overflow-x-hidden">
      <Header />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">

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
              {stats.overdue > 0 ? `${stats.overdue} просроченных задач` : 'Все задачи в порядке'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1">
              {[
                { id: 'board', label: 'Доска', icon: LayoutList },
                { id: 'calendar', label: 'Календарь', icon: Calendar },
              ].map(v => (
                <button 
                  key={v.id} 
                  onClick={() => setView(v.id)} 
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                    view === v.id ? 'bg-white shadow-lg text-green-700' : 'text-gray-500'
                  }`}
                >
                  <v.icon className="w-4 h-4" /> <span className="hidden sm:inline">{v.label}</span>
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
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
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

        {/* Статистика / вкладки доски */}
        {view === 'board' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
          {COLUMNS.map(col => {
            const count = getColumnTotal(col.id)
            const isActiveTab = boardColumn === col.id
            return (
              <button
                type="button"
                key={col.id}
                onClick={() => setBoardColumn(col.id)}
                className={`bg-gradient-to-br ${col.color} rounded-xl p-2 sm:p-3 text-center border ${col.border} transition-all max-md:active:scale-[0.98] md:cursor-default sm:hover:scale-105 ${
                  isActiveTab ? 'max-md:ring-2 max-md:ring-green-600 max-md:ring-offset-1 max-md:shadow-md' : ''
                }`}
              >
                <col.icon className="w-4 h-4 mx-auto mb-1 opacity-60" />
                <p className="text-xl sm:text-2xl font-bold">{count}</p>
                <p className="text-[10px] sm:text-xs text-gray-600">{col.title}</p>
              </button>
            )
          })}
        </div>
        )}

        {/* Доска задач — мобильный список по выбранной вкладке */}
        {view === 'board' && (
          <div className="md:hidden">
            {(() => {
              const activeCol = COLUMNS.find(c => c.id === boardColumn) || COLUMNS[1]
              const items = getColumnItems(boardColumn)
              const total = getColumnTotal(boardColumn)
              return (
                <div className={`bg-gradient-to-br ${activeCol.color} rounded-2xl p-3 border ${activeCol.border} shadow-sm`}>
                  <div className="flex items-center gap-2 mb-3">
                    <activeCol.icon className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">{activeCol.title}</h3>
                    <span className="ml-auto text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
                      {items.length} из {total}
                    </span>
                  </div>

                  <div className="space-y-2 min-h-[80px]">
                    {items.map(r => renderBoardTaskCard(r, boardColumn))}
                    {items.length === 0 && (
                      <div className="text-center py-8">
                        <Flower2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Нет задач в этой категории</p>
                      </div>
                    )}
                  </div>

                  {total > 10 && (
                    <p className="text-[11px] text-gray-500 text-center mt-3">
                      Показаны последние 10 из {total}. На компьютере — полная доска.
                    </p>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Доска задач — 4 колонки на планшете и десктопе */}
        {view === 'board' && (
          <div className="hidden md:block overflow-x-hidden">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {COLUMNS.map(col => {
                const items = getColumnItems(col.id)
                const total = getColumnTotal(col.id)

                return (
                  <div key={col.id} className={`bg-gradient-to-br ${col.color} rounded-2xl p-3 border ${col.border} shadow-sm`}>
                    <div className="flex items-center gap-2 mb-3">
                      <col.icon className="w-4 h-4" />
                      <h3 className="font-semibold text-sm">{col.title}</h3>
                      <span className="ml-auto text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
                        {items.length} / {total}
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[100px]">
                      {items.map(r => renderBoardTaskCard(r, col.id))}
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

        {/* Календарь */}
        {view === 'calendar' && (
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                
                {/* Заголовок месяца */}
                <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white px-3 sm:px-4 py-3 sm:py-4">
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
                      className="p-2 hover:bg-white/20 rounded-xl transition-all min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                      <h2 className="text-lg sm:text-xl font-bold">{MONTHS[calMonth]}</h2>
                      <p className="text-xs sm:text-sm text-white/70">{calYear}</p>
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
                      className="p-2 hover:bg-white/20 rounded-xl transition-all min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Дни недели */}
                <div className="grid grid-cols-7 border-b bg-gray-50">
                  {DAYS.map(d => (
                    <div key={d} className="py-2 sm:p-3 text-center text-[10px] sm:text-sm font-semibold text-gray-600">
                      <span className="sm:hidden">{d[0]}</span>
                      <span className="hidden sm:inline">{d}</span>
                    </div>
                  ))}
                </div>
                
                {/* Дни месяца */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((item, i) => {
                    if (!item) {
                      return (
                        <div
                          key={`e${i}`}
                          className="aspect-square border-r border-b bg-gray-50/30 sm:aspect-auto sm:min-h-[100px]"
                        />
                      )
                    }

                    const isSelected = item.date === selectedDate
                    
                    return (
                      <div 
                        key={item.date} 
                        onClick={() => setSelectedDate(item.date)}
                        className={`aspect-square border-r border-b cursor-pointer transition-all duration-200 overflow-hidden sm:aspect-auto sm:min-h-[100px] sm:p-2 hover:shadow-inner ${
                          isSelected ? 'bg-gradient-to-br from-green-50 to-emerald-50 ring-2 ring-green-400 ring-inset z-[1]' : ''
                        } ${item.isToday ? 'bg-amber-50/50' : ''}`}
                      >
                        {/* Мобильная ячейка — компактно */}
                        <div className="flex flex-col items-center justify-center h-full p-0.5 sm:hidden">
                          <span className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center leading-none ${
                            item.isToday ? 'bg-amber-500 text-white' : 'text-gray-800'
                          }`}>
                            {item.day}
                          </span>
                          {(item.pending > 0 || item.completed > 0) && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {item.pending > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                              {item.completed > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                            </div>
                          )}
                        </div>

                        {/* Десктоп / планшет */}
                        <div className="hidden sm:block h-full">
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
                      </div>
                    )
                  })}
                </div>

                <p className="sm:hidden px-3 py-2 text-[10px] text-gray-400 text-center border-t bg-gray-50">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 align-middle" />
                  активные
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mx-1 align-middle" />
                  выполненные
                </p>
              </div>
            </div>
            
            {/* Задачи выбранного дня */}
            <div className="lg:w-96 min-w-0">
              {selectedDate ? (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-5 py-3 sm:py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-white/80">Выбранный день</p>
                        <h3 className="text-base sm:text-lg font-bold leading-snug">
                          {new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(today)}
                        className="shrink-0 text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        Сегодня
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                      <p className="text-sm text-gray-500">{selectedDayReminders.length} задач</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedDayReminders.some((r) => r.status !== 'completed') && (
                          <button
                            type="button"
                            onClick={completeAllSelectedDay}
                            disabled={bulkDayAction}
                            className="text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50"
                          >
                            Все выполнены
                          </button>
                        )}
                        {selectedDayReminders.some((r) => r.status === 'completed') && (
                          <button
                            type="button"
                            onClick={uncompleteAllSelectedDay}
                            disabled={bulkDayAction}
                            className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                          >
                            Вернуть все
                          </button>
                        )}
                        {selectedDayReminders.some((r) => r.status !== 'completed') && (
                          <button
                            type="button"
                            onClick={deleteAllPendingSelectedDay}
                            disabled={bulkDayAction}
                            className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50"
                          >
                            Удалить невыполненные
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowAddModal(true)}
                          className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors shrink-0"
                        >
                          + Добавить
                        </button>
                      </div>
                    </div>
                    
                    {selectedDayReminders.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Flower2 className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" />
                        </div>
                        <p className="text-gray-400 text-sm">Нет задач на этот день</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[50vh] sm:max-h-[400px] overflow-y-auto">
                        {selectedDayReminders.map(r => (
                          <div 
                            key={r.id} 
                            className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all ${
                              r.status === 'completed' ? 'bg-gray-50 opacity-60' : 
                              r.due_date < today ? 'bg-red-50 border-l-4 border-red-400' : 
                              r.due_date === today ? 'bg-amber-50 border-l-4 border-amber-400' : 'bg-gray-50'
                            }`}
                          >
                            <button 
                              type="button"
                              onClick={() => toggleReminderComplete(r)} 
                              disabled={completingId === r.id}
                              className="min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-50 shrink-0"
                              title={r.status === 'completed' ? 'Вернуть в невыполненные' : 'Отметить выполненной'}
                            >
                              {r.status === 'completed' ? 
                                <CheckCircle className="w-5 h-5 text-green-500 hover:text-amber-500 transition-colors" /> : 
                                <Circle className="w-5 h-5 text-gray-300 hover:text-green-500 transition-colors" />
                              }
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                {getIcon(r.type, "w-4 h-4 shrink-0")}
                                <span className={`text-sm truncate ${r.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                                  {r.title}
                                </span>
                              </div>
                              {r.plants && (
                                <p className="text-xs text-gray-500 ml-6 truncate">{r.plants.name}</p>
                              )}
                            </div>
                            {r.status !== 'completed' && (
                              <button 
                                type="button"
                                onClick={() => deleteReminder(r.id)} 
                                className="p-2 text-gray-300 hover:text-red-500 min-w-[36px] min-h-[36px] transition-colors shrink-0"
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="hidden sm:block bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
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
                        <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.day}</span>
                      </div>
                      <p className="text-xs font-semibold mt-2 text-gray-700">{stage.name}</p>
                      <p className="text-xs text-gray-400">{stage.day} дн.</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <h4 className="font-semibold text-sm mb-3">Связанные задачи</h4>
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
                <option value="watering">{TASK_TYPE_LABELS.watering}</option>
                <option value="fertilizing">{TASK_TYPE_LABELS.fertilizing}</option>
                <option value="transplant">{TASK_TYPE_LABELS.transplant}</option>
                <option value="harvest">{TASK_TYPE_LABELS.harvest}</option>
                <option value="custom">{TASK_TYPE_LABELS.custom}</option>
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
                <option value="">Без растения</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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