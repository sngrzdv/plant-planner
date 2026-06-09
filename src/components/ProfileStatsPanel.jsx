import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutGrid, Flower, Sprout, Calendar, CheckCircle, Clock, AlertCircle,
  TrendingUp, History, Target, BookOpen, Download, ChevronDown, Leaf,
  BarChart3, Repeat, FileSpreadsheet, FileText, Image as ImageIcon,
} from 'lucide-react'
import { exportSeasonReport } from '../services/statsExportService'
import { toast } from '../store/toastStore'

function StatBox({ icon, value, label, color, sublabel }) {
  return (
    <div className={`rounded-2xl p-3 sm:p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-lg sm:text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs sm:text-sm opacity-75">{label}</p>
      {sublabel && <p className="text-[10px] sm:text-xs opacity-60 mt-0.5">{sublabel}</p>}
    </div>
  )
}

function DeltaBadge({ value }) {
  if (value === 0) return <span className="text-gray-400 text-xs">без изменений</span>
  const positive = value > 0
  return (
    <span className={`text-xs font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
      {positive ? '+' : ''}{value}
    </span>
  )
}

const EXPORT_OPTIONS = [
  { id: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { id: 'word', label: 'Word (.doc)', icon: FileText },
  { id: 'csv', label: 'CSV для Excel', icon: FileSpreadsheet },
  { id: 'png', label: 'Картинка (PNG)', icon: ImageIcon },
]

export default function ProfileStatsPanel({
  data,
  loading,
  seasonYear,
  onSeasonYearChange,
  onExport,
}) {
  const reportRef = useRef(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleExport(format) {
    if (!data) return
    setExportOpen(false)
    setExporting(true)
    try {
      await exportSeasonReport(data, format, { captureElement: reportRef.current })
      onExport?.(format)
      toast.success('Отчёт сохранён')
    } catch (e) {
      console.error(e)
      toast.error('Не удалось выгрузить отчёт')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">Нет данных</div>
  }

  const { overview, gardens, cultures, journalRecent, journalByAction, monthlyTasks, yearComparison, recommendations, availableYears } = data
  const maxCompleted = Math.max(...monthlyTasks.map((m) => m.completed), 1)
  const maxCulture = cultures[0]?.total || 1

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="season-year" className="text-sm text-gray-600 shrink-0">Сезон</label>
          <select
            id="season-year"
            value={seasonYear}
            onChange={(e) => onSeasonYearChange(Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400 hidden sm:inline">год посадок и событий</span>
        </div>

        <div className="relative">
          <button
            type="button"
            disabled={exporting}
            onClick={() => setExportOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Формируем…' : 'Выгрузить отчёт'}
            <ChevronDown className="w-4 h-4 opacity-80" />
          </button>
          {exportOpen && (
            <>
              <button type="button" className="fixed inset-0 z-10" aria-label="Закрыть" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                {EXPORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleExport(opt.id)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <opt.icon className="w-4 h-4 text-green-600 shrink-0" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div
        ref={reportRef}
        data-season-year={seasonYear}
        className="space-y-4 sm:space-y-6 bg-transparent"
      >
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 border border-green-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Сводка сезона {seasonYear}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            По текущим посадкам на грядках, журналу, рассаде и задачам за выбранный год
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox
            icon={<Sprout className="w-5 h-5" />}
            value={overview.newPlantingsThisSeason}
            label="Новые посадки"
            color="bg-green-50 text-green-700"
            sublabel={`из ${overview.totalSpots} на грядках`}
          />
          <StatBox
            icon={<Repeat className="w-5 h-5" />}
            value={overview.carriedOverPlantings}
            label="С прошлых сезонов"
            color="bg-emerald-50 text-emerald-700"
            sublabel="многолетники и перенос"
          />
          <StatBox
            icon={<Leaf className="w-5 h-5" />}
            value={overview.uniqueCultures}
            label="Культур"
            color="bg-lime-50 text-lime-700"
            sublabel={`${overview.gardensCount} участков`}
          />
          <StatBox
            icon={<Flower className="w-5 h-5" />}
            value={overview.seedlingsSowed}
            label="Рассада"
            color="bg-amber-50 text-amber-700"
            sublabel={overview.seedlingsTransplanted > 0 ? `пересажено: ${overview.seedlingsTransplanted}` : undefined}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox icon={<LayoutGrid className="w-5 h-5" />} value={overview.gardensCount} label="Участков" color="bg-blue-50 text-blue-600" />
          <StatBox icon={<LayoutGrid className="w-5 h-5" />} value={overview.bedsCount} label="Грядок" color="bg-sky-50 text-sky-600" />
          <StatBox icon={<History className="w-5 h-5" />} value={overview.journalEvents} label="Событий в журнале" color="bg-indigo-50 text-indigo-600" />
          <StatBox
            icon={overview.tasksOverdue > 0 ? <AlertCircle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            value={overview.tasksOverdue > 0 ? overview.tasksOverdue : overview.tasksCompleted}
            label={overview.tasksOverdue > 0 ? 'Просрочено задач' : 'Задач выполнено'}
            color={overview.tasksOverdue > 0 ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'}
          />
        </div>

        {yearComparison && (
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Сравнение с {yearComparison.previousYear} годом
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-gray-500 text-xs">Новые посадки</p>
                <p className="font-semibold mt-1">{yearComparison.current.newPlantings} <DeltaBadge value={yearComparison.delta.newPlantings} /></p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-gray-500 text-xs">События в журнале</p>
                <p className="font-semibold mt-1">{yearComparison.current.journalEvents} <DeltaBadge value={yearComparison.delta.journalEvents} /></p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-gray-500 text-xs">Задачи выполнены</p>
                <p className="font-semibold mt-1">{yearComparison.current.tasksCompleted} <DeltaBadge value={yearComparison.delta.tasksCompleted} /></p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-gray-500 text-xs">Культур</p>
                <p className="font-semibold mt-1">{yearComparison.current.uniqueCultures} <DeltaBadge value={yearComparison.delta.uniqueCultures} /></p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" /> Культуры сезона
            </h3>
            {cultures.length === 0 ? (
              <p className="text-gray-400 text-sm">Отметьте посадки на схеме грядки — здесь появится разбивка по культурам</p>
            ) : (
              <div className="space-y-3">
                {cultures.slice(0, 8).map((c) => (
                  <div key={c.plantId ?? c.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate pr-2">{c.name}</span>
                      <span className="text-gray-500 shrink-0">{c.total} шт.</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      {c.newThisSeason > 0 && (
                        <div className="bg-green-500 h-full" style={{ width: `${(c.newThisSeason / maxCulture) * 100}%` }} title={`Новые: ${c.newThisSeason}`} />
                      )}
                      {c.carriedOver > 0 && (
                        <div className="bg-emerald-300 h-full" style={{ width: `${(c.carriedOver / maxCulture) * 100}%` }} title={`С прошлых лет: ${c.carriedOver}`} />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      новые: {c.newThisSeason} · с прошлых лет: {c.carriedOver}
                      {c.gardens.length > 0 && ` · ${c.gardens.join(', ')}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-blue-600" /> По участкам
            </h3>
            {gardens.length === 0 ? (
              <p className="text-gray-400 text-sm">Создайте участок и грядки в разделе «Мои участки»</p>
            ) : (
              <div className="space-y-3">
                {gardens.map((g) => (
                  <div key={g.id || g.name} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-gray-800">{g.name}</p>
                      <span className="text-xs text-gray-500 shrink-0">{g.bedsCount} грядок</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {g.spotsTotal} посадок · новые {g.newThisSeason} · с прошлых {g.carriedOver}
                    </p>
                    {g.topCultures.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {g.topCultures.map((t) => `${t.name} (${t.count})`).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link to="/gardens" className="inline-block mt-4 text-sm text-green-600 hover:text-green-700 font-medium">
              Открыть участки →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" /> Задачи сезона
            </h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div className="bg-green-600 h-3 rounded-full transition-all" style={{ width: `${overview.completionRate}%` }} />
              </div>
              <span className="text-sm font-medium">{overview.completionRate}%</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span>Выполнено: {overview.tasksCompleted}</span></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" /><span>Активных: {overview.tasksPending}</span></div>
            </div>
            {monthlyTasks.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2">По месяцам</p>
                <div className="flex items-end gap-2 h-24">
                  {monthlyTasks.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[10px] text-gray-500">{m.completed}</span>
                      <div className="w-full bg-green-500 rounded-t" style={{ height: `${(m.completed / maxCompleted) * 100}%`, minHeight: m.completed > 0 ? 4 : 0 }} />
                      <span className="text-[10px] text-gray-500">{m.monthLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Link to="/reminders" className="inline-block mt-4 text-sm text-green-600 hover:text-green-700 font-medium">Календарь задач →</Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" /> Журнал сезона
            </h3>
            {journalByAction.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {journalByAction.map((a) => (
                  <span key={a.action} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                    {a.label}: {a.count}
                  </span>
                ))}
              </div>
            )}
            {journalRecent.length === 0 ? (
              <p className="text-gray-400 text-sm">События появятся после посева, пересадки или записи в дневник</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {journalRecent.map((entry) => (
                  <li key={entry.id} className="flex gap-3 p-2.5 bg-gray-50 rounded-xl text-sm">
                    <span className="text-gray-400 text-xs whitespace-nowrap pt-0.5">{entry.date}</span>
                    <div className="min-w-0">
                      <span className="text-xs text-gray-500">{entry.action}</span>
                      <p className="font-medium text-gray-800 truncate">{entry.title}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {data.userPlantsCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded-xl px-4 py-3 border border-gray-100">
            <BookOpen className="w-4 h-4 text-green-600" />
            <span>В личном дневнике: <strong>{data.userPlantsCount}</strong> записей</span>
            <Link to="/catalog" className="ml-auto text-green-600 hover:text-green-700 text-xs font-medium">Каталог →</Link>
          </div>
        )}

        <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-4 sm:p-6">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-green-600" /> Выводы по сезону
          </h3>
          <ul className="text-sm text-gray-600 space-y-1.5">
            {recommendations.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
