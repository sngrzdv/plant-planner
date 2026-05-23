import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import lunarService from '../services/lunarService'
import { getMoonData, getMoonZodiac } from '../utils/lunar'
import { ChevronLeft, ChevronRight, Moon, X, Calendar, Droplets, Sprout, Sun } from 'lucide-react'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

const CROPS = [
  { value: null, label: 'Все культуры' },
  { value: 'томаты', label: 'Томаты' },
  { value: 'огурцы', label: 'Огурцы' },
  { value: 'морковь', label: 'Морковь' },
  { value: 'картофель', label: 'Картофель' },
  { value: 'лук', label: 'Лук' },
  { value: 'зелень', label: 'Зелень' },
  { value: 'цветы', label: 'Цветы' },
]

export default function LunarCalendar() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const [crop, setCrop] = useState(null)
  const [calendar, setCalendar] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    setLoading(true)
    const result = lunarService.getCalendarWithRecommendations(year, month, crop)
    if (result.success) setCalendar(result.data)
    setLoading(false)
  }, [year, month, crop])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const goToToday = () => {
    setMonth(today.getMonth())
    setYear(today.getFullYear())
  }

  const getDaysInGrid = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfWeek = new Date(year, month, 1).getDay() || 7
    const grid = []

    for (let i = 1; i < firstDayOfWeek; i++) grid.push(null)
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i, 12, 0, 0)
      const moonData = getMoonData(date)
      const dayData = calendar.find(d => d.day === i)
      grid.push({
        day: i,
        date,
        moonData,
        recommendation: dayData?.recommendation,
        zodiac: dayData?.zodiac || getMoonZodiac(date)
      })
    }
    return grid
  }

  const grid = getDaysInGrid()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pb-20 sm:pb-0">
      <Header />
      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Moon className="w-6 h-6 text-indigo-600" />
              Лунный календарь садовода
            </h1>
            <p className="text-sm text-gray-500 mt-1">Планируйте посадки по лунным фазам</p>
          </div>
          <button onClick={goToToday} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 w-full sm:w-auto">
            Сегодня
          </button>
        </div>

        {/* Навигация по месяцам */}
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight className="w-5 h-5" /></button>
        </div>

        {/* Фильтр культур */}
        <div className="flex flex-wrap gap-2">
          {CROPS.map(c => (
            <button
              key={c.value || 'all'}
              onClick={() => setCrop(c.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                crop === c.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Календарь */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Дни недели */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
              <div key={d} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-gray-500">{d}</div>
            ))}
          </div>

          {/* Сетка */}
          <div className="grid grid-cols-7">
            {grid.map((item, i) => {
              if (!item) return <div key={`e${i}`} className="p-1 sm:p-2 border-r border-b min-h-[80px] sm:min-h-[100px] bg-gray-50/30" />

              const isToday = item.date.toDateString() === today.toDateString()
              const isSelected = selectedDay?.day === item.day
              const rec = item.recommendation

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(item)}
                  className={`p-1 sm:p-2 border-r border-b cursor-pointer transition-all hover:bg-gray-50 ${
                    isSelected ? 'bg-indigo-50 ring-2 ring-indigo-400 ring-inset' : ''
                  } ${isToday ? 'bg-amber-50' : ''} ${rec?.color || ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-indigo-600 text-white' : ''
                    }`}>
                      {item.day}
                    </span>
                    <span className="text-lg sm:text-xl">{item.moonData.emoji}</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">{item.moonData.phase}</p>
                  {crop && rec && (
                    <div className="mt-1">
                      {rec.status === 'favorable' && <span className="text-[10px] text-green-600 font-medium">✅</span>}
                      {rec.status === 'unfavorable' && <span className="text-[10px] text-red-500 font-medium">⛔</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Легенда */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>🌑 Новолуние — покой</span>
          <span>🌒🌔 Растущая — надземные</span>
          <span>🌕 Полнолуние — сбор</span>
          <span>🌖🌘 Убывающая — корнеплоды</span>
        </div>
      </main>

      <MobileNav />

      {/* Модальное окно с деталями дня */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setSelectedDay(null)}>
          <div 
            className="bg-white rounded-t-2xl sm:rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {selectedDay.day} {MONTHS[month]} {year}
                <span className="text-sm text-gray-500 ml-2">
                  {selectedDay.date.toLocaleDateString('ru-RU', { weekday: 'long' })}
                </span>
              </h3>
              <button onClick={() => setSelectedDay(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Фаза Луны */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-2xl">
              <span className="text-5xl">{selectedDay.moonData.emoji}</span>
              <div>
                <p className="text-xl font-bold">{selectedDay.moonData.phase}</p>
                <p className="text-sm text-gray-500">♈ Знак: {selectedDay.zodiac}</p>
              </div>
            </div>

            {/* Характеристики */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Возраст Луны</p>
                <p className="text-lg font-bold">{selectedDay.moonData.age} дн.</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Освещённость</p>
                <p className="text-lg font-bold">{selectedDay.moonData.illumination}%</p>
              </div>
            </div>

            {/* Рекомендации */}
            {selectedDay.recommendation && (
              <div className="space-y-4">
                {/* Статус */}
                <div className="text-center">
                  {selectedDay.recommendation.status === 'favorable' && (
                    <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium">✅ Благоприятный день</span>
                  )}
                  {selectedDay.recommendation.status === 'unfavorable' && (
                    <span className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-full font-medium">⛔ Не рекомендуется</span>
                  )}
                  {selectedDay.recommendation.status === 'neutral' && (
                    <span className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium">⏸ Нейтральный день</span>
                  )}
                </div>

                {crop && (
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <p className="text-sm text-gray-500">Для культуры: {CROPS.find(c => c.value === crop)?.label}</p>
                    <p className="text-sm text-gray-700 mt-1">{selectedDay.recommendation.description}</p>
                  </div>
                )}

                {/* Рекомендуется */}
                <div>
                  <p className="font-medium text-sm text-green-700 mb-2 flex items-center gap-1">
                    <Sprout className="w-4 h-4" /> Рекомендуется:
                  </p>
                  <ul className="space-y-1">
                    {selectedDay.recommendation.recommend.slice(0, 4).map((rec, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-green-500">✓</span> {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Не рекомендуется */}
                {selectedDay.recommendation.avoid.length > 0 && (
                  <div>
                    <p className="font-medium text-sm text-red-700 mb-2">Не рекомендуется:</p>
                    <ul className="space-y-1">
                      {selectedDay.recommendation.avoid.slice(0, 4).map((act, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="text-red-500">✕</span> {act}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Кнопка закрытия */}
            <button
              onClick={() => setSelectedDay(null)}
              className="w-full mt-6 py-3 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Стили для анимации */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        @media (min-width: 640px) {
          .animate-slide-up {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}