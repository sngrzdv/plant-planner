import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { 
  Calendar, CheckCircle, Circle, Droplets, Sprout, 
  Scissors, AlertCircle, ChevronLeft, ChevronRight,
  Plus, X, Clock, Trash2, TrendingUp
} from 'lucide-react'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'

const COLUMNS = [
  { id: 'overdue', title: 'Просрочено', color: 'bg-red-50', border: 'border-red-200', icon: AlertCircle },
  { id: 'today', title: 'Сегодня', color: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  { id: 'upcoming', title: 'Предстоит', color: 'bg-blue-50', border: 'border-blue-200', icon: Calendar },
  { id: 'completed', title: 'Выполнено', color: 'bg-green-50', border: 'border-green-200', icon: CheckCircle },
]

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export default function Reminders() {
  const { user } = useAuthStore()
  const [reminders, setReminders] = useState([])
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('board')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [draggedReminder, setDraggedReminder] = useState(null)
  
  // Календарь
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  
  const [newTask, setNewTask] = useState({
    title: '', type: 'watering', due_date: new Date().toISOString().split('T')[0], plant_id: '', repeat_days: 0
  })

  useEffect(() => { loadReminders() }, [])
  useEffect(() => { if (showAddModal) loadPlants() }, [showAddModal])

  async function loadReminders() {
    const { data } = await supabase
      .from('reminders')
      .select(`*, plants:plant_id(id, name, watering_freq_days, maturation_days, image_url)`)
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })
    if (data) setReminders(data)
    setLoading(false)
  }

  async function loadPlants() {
    const { data } = await supabase.from('plants').select('*').order('name')
    if (data) setPlants(data)
  }

  async function completeReminder(id) {
    await supabase.from('reminders').update({ status: 'completed' }).eq('id', id)
    setReminders(rs => rs.map(r => r.id === id ? { ...r, status: 'completed' } : r))
  }

  async function skipReminder(id) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await supabase.from('reminders').update({ due_date: tomorrow.toISOString().split('T')[0] }).eq('id', id)
    loadReminders()
  }

  async function deleteReminder(id) {
    await supabase.from('reminders').delete().eq('id', id)
    setReminders(rs => rs.filter(r => r.id !== id))
  }

  async function addReminder() {
    if (!newTask.title.trim()) return alert('Введите название')
    const tasks = [{ user_id: user.id, title: newTask.title, type: newTask.type, due_date: newTask.due_date, plant_id: newTask.plant_id || null, status: 'pending', source: 'user' }]
    if (newTask.repeat_days > 0) {
      for (let i = 1; i <= 10; i++) {
        const d = new Date(newTask.due_date)
        d.setDate(d.getDate() + i * newTask.repeat_days)
        tasks.push({ user_id: user.id, title: newTask.title, type: newTask.type, due_date: d.toISOString().split('T')[0], plant_id: newTask.plant_id || null, status: 'pending', source: 'user' })
      }
    }

    notificationService.send('📝 Новая задача', {
      body: `Задача "${newTask.title}" добавлена на ${newTask.due_date}`,
      tag: 'new-task'
    })
    await supabase.from('reminders').insert(tasks)
    setShowAddModal(false)
    setNewTask({ title: '', type: 'watering', due_date: new Date().toISOString().split('T')[0], plant_id: '', repeat_days: 0 })
    loadReminders()
  }

  function getIcon(type) {
    switch (type) {
      case 'watering': return <Droplets className="w-3.5 h-3.5 text-blue-500" />
      case 'harvest': return <Scissors className="w-3.5 h-3.5 text-amber-500" />
      case 'transplant': return <Sprout className="w-3.5 h-3.5 text-green-500" />
      case 'fertilizing': return <Sparkles className="w-3.5 h-3.5 text-purple-500" />
      default: return <Calendar className="w-3.5 h-3.5 text-gray-500" />
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

  function handleDragStart(reminder) { setDraggedReminder(reminder) }
  function handleDrop(targetStatus) {
    if (!draggedReminder) return
    if (targetStatus === 'completed') completeReminder(draggedReminder.id)
    else if (targetStatus === 'today') skipReminder(draggedReminder.id)
    setDraggedReminder(null)
  }
  function handleDragOver(e) { e.preventDefault() }

  // Календарь
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
      
      grid.push({
        day: d,
        date: dateStr,
        reminders: dayReminders,
        pending,
        completed,
        isToday: dateStr === today
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0">
      <Header />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-green-600" />
              Умный календарь ухода
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-red-400" /> {stats.overdue} просрочено</span>
              <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-green-400" /> {stats.completionRate}% выполнено</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1">
              {[
                { id: 'board', label: 'Доска', icon: '📋' },
                { id: 'calendar', label: 'Календарь', icon: '📅' },
              ].map(v => (
                <button key={v.id} onClick={() => setView(v.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === v.id ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}>
                  {v.icon} <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Добавить</span>
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {COLUMNS.map(col => {
            const count = col.id === 'completed' ? stats.completed : col.id === 'overdue' ? stats.overdue : col.id === 'today' ? groupedByStatus.today.length : groupedByStatus.upcoming.length
            return (
              <div key={col.id} className={`rounded-xl p-3 text-center ${col.color} border ${col.border}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-gray-600">{col.title}</p>
              </div>
            )
          })}
        </div>

        {/* Доска задач */}
        {view === 'board' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {COLUMNS.map(col => {
              const items = col.id === 'overdue' ? groupedByStatus.overdue : col.id === 'today' ? groupedByStatus.today : col.id === 'upcoming' ? groupedByStatus.upcoming.slice(0, 10) : groupedByStatus.completed.slice(0, 10)
              
              return (
                <div key={col.id} className={`rounded-2xl p-3 ${col.color} border ${col.border}`} onDragOver={handleDragOver} onDrop={() => handleDrop(col.id)}>
                  <div className="flex items-center gap-2 mb-3">
                    <col.icon className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">{col.title}</h3>
                    <span className="ml-auto text-xs text-gray-500">{items.length}</span>
                  </div>
                  
                  <div className="space-y-1.5 min-h-[100px]">
                    {items.map(r => (
                      <div key={r.id} draggable onDragStart={() => handleDragStart(r)}
                        className="bg-white rounded-xl p-2.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        onClick={() => { setSelectedReminder(r); if (r.plants) setShowTimeline(true); }}>
                        <div className="flex items-center gap-2">
                          {getIcon(r.type)}
                          <span className="text-sm font-medium truncate flex-1">{r.title}</span>
                        </div>
                        {r.plants && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {r.plants.image_url ? <img src={r.plants.image_url} className="w-5 h-5 rounded object-cover" /> : <span className="text-xs">🌱</span>}
                            <span className="text-xs text-gray-500">{r.plants.name}</span>
                          </div>
                        )}
                        {col.id !== 'completed' && (
                          <div className="flex gap-1 mt-2">
                            <button onClick={(e) => { e.stopPropagation(); completeReminder(r.id); }} className="flex-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md hover:bg-green-200">✓</button>
                            <button onClick={(e) => { e.stopPropagation(); skipReminder(r.id); }} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-200">→</button>
                            <button onClick={(e) => { e.stopPropagation(); deleteReminder(r.id); }} className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded-md hover:bg-red-100">✕</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Пусто</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Календарь */}
        {view === 'calendar' && (
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Месяц */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
                <h2 className="font-semibold text-gray-800">{MONTHS[calMonth]} {calYear}</h2>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
              </div>
              
              {/* Дни недели */}
              <div className="grid grid-cols-7 border-b">
                {DAYS.map(d => <div key={d} className="p-2 text-center text-xs font-medium text-gray-500">{d}</div>)}
              </div>
              
              {/* Дни */}
              <div className="grid grid-cols-7">
                {calendarDays.map((item, i) => {
                  if (!item) return <div key={`e${i}`} className="p-1.5 border-r border-b min-h-[80px] bg-gray-50/30" />
                  
                  const isSelected = item.date === selectedDate
                  
                  return (
                    <div key={item.date} onClick={() => setSelectedDate(item.date)}
                      className={`p-1.5 border-r border-b cursor-pointer transition-colors hover:bg-gray-50 min-h-[80px] ${
                        isSelected ? 'bg-green-50 ring-2 ring-green-400 ring-inset' : ''
                      } ${item.isToday ? 'bg-amber-50' : ''}`}>
                      <span className={`text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center ${item.isToday ? 'bg-amber-500 text-white' : ''}`}>
                        {item.day}
                      </span>
                      <div className="space-y-0.5 mt-1">
                        {item.pending > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            <span className="text-[10px] text-red-600">{item.pending}</span>
                          </div>
                        )}
                        {item.completed > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            <span className="text-[10px] text-green-600">{item.completed}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Боковая панель дня */}
            <div className="lg:w-80 bg-white rounded-2xl shadow-sm p-4 sm:p-5">
              {selectedDate ? (
                <>
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{selectedDayReminders.length} задач</p>
                  
                  {selectedDayReminders.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Задач нет</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedDayReminders.map(r => (
                        <div key={r.id} className={`flex items-center gap-2 p-2.5 rounded-xl ${r.status === 'completed' ? 'bg-gray-50 opacity-60' : r.due_date < today ? 'bg-red-50' : r.due_date === today ? 'bg-amber-50' : 'bg-gray-50'}`}>
                          <button onClick={() => completeReminder(r.id)} disabled={r.status === 'completed'}>
                            {r.status === 'completed' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-gray-300 hover:text-green-500" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {getIcon(r.type)}
                              <span className={`text-sm truncate ${r.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{r.title}</span>
                            </div>
                            {r.plants && <p className="text-xs text-gray-500 ml-5">{r.plants.name}</p>}
                          </div>
                          <button onClick={() => deleteReminder(r.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Выберите день в календаре</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Шкала жизни растения */}
        {showTimeline && selectedReminder?.plants && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowTimeline(false); setSelectedReminder(null); }}>
            <div className="bg-white rounded-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectedReminder.plants.image_url ? <img src={selectedReminder.plants.image_url} className="w-12 h-12 rounded-xl object-cover" /> : <span className="text-3xl">🌱</span>}
                  <div>
                    <h3 className="text-lg font-semibold">{selectedReminder.plants.name}</h3>
                    <p className="text-sm text-gray-500">Срок созревания: {selectedReminder.plants.maturation_days} дней</p>
                  </div>
                </div>
                <button onClick={() => { setShowTimeline(false); setSelectedReminder(null); }}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              
              <div className="relative mt-8 mb-2">
                <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 rounded" />
                <div className="relative flex justify-between">
                  {getPlantTimeline(selectedReminder.plants).map((stage, i) => (
                    <div key={i} className="flex flex-col items-center" style={{ width: 60 }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow" style={{ backgroundColor: stage.color + '20', border: `2px solid ${stage.color}` }}>{stage.emoji}</div>
                      <p className="text-[10px] font-medium mt-1 text-center">{stage.name}</p>
                      <p className="text-[9px] text-gray-400">{stage.day} дн.</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t pt-4">
                <h4 className="font-medium text-sm mb-2">Связанные задачи</h4>
                {reminders.filter(r => r.plant_id === selectedReminder.plant_id).slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-sm py-1">
                    {getIcon(r.type)}
                    <span>{r.title}</span>
                    <span className="text-xs text-gray-400">{new Date(r.due_date).toLocaleDateString('ru-RU')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      
      <MobileNav />

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Новая задача</h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Название задачи" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" autoFocus />
              <select value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl">
                <option value="watering">💧 Полив</option>
                <option value="fertilizing">🧪 Подкормка</option>
                <option value="transplant">🌱 Пересадка</option>
                <option value="harvest">✂️ Сбор урожая</option>
                <option value="custom">📝 Другое</option>
              </select>
              <input type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
              <select value={newTask.plant_id} onChange={e => setNewTask({...newTask, plant_id: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl">
                <option value="">Без растения</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Повторять каждые (дней, 0 — не повторять)</label>
                <input type="number" min="0" max="90" value={newTask.repeat_days} onChange={e => setNewTask({...newTask, repeat_days: parseInt(e.target.value) || 0})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={addReminder} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 font-medium">Добавить</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Sparkles(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />
    </svg>
  )
}