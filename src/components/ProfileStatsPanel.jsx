import { Link } from 'react-router-dom'
import {
  LayoutGrid, Flower, Sprout, Calendar, CheckCircle, Clock, AlertCircle,
  TrendingUp, Award, History, Target, BookOpen,
} from 'lucide-react'

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

export default function ProfileStatsPanel({ data, loading }) {
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

  const { summary, yearlyStats, recentJournal, monthlyCompleted, recommendations } = data
  const maxCompleted = Math.max(...monthlyCompleted.map((m) => m.completed), 1)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox
          icon={<LayoutGrid className="w-5 h-5" />}
          value={summary.gardens}
          label="Участков"
          color="bg-blue-50 text-blue-600"
        />
        <StatBox
          icon={<Sprout className="w-5 h-5" />}
          value={summary.plantSpots}
          label="Посадок"
          color="bg-green-50 text-green-600"
          sublabel={`${summary.uniqueCultures} культур`}
        />
        <StatBox
          icon={<Flower className="w-5 h-5" />}
          value={summary.potsGrowing}
          label="Рассада"
          color="bg-amber-50 text-amber-600"
          sublabel={summary.potsTransplanted > 0 ? `пересажено: ${summary.potsTransplanted}` : undefined}
        />
        <StatBox
          icon={summary.overdueTasks > 0
            ? <AlertCircle className="w-5 h-5" />
            : <Calendar className="w-5 h-5" />}
          value={summary.overdueTasks > 0 ? summary.overdueTasks : summary.todayTasks}
          label={summary.overdueTasks > 0 ? 'Просрочено' : 'На сегодня'}
          color={summary.overdueTasks > 0 ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'}
        />
      </div>

      {summary.userPlantsCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded-xl px-4 py-3 border border-gray-100">
          <BookOpen className="w-4 h-4 text-green-600" />
          <span>В личном дневнике: <strong>{summary.userPlantsCount}</strong> {summary.userPlantsCount === 1 ? 'растение' : 'растений'}</span>
          <Link to="/catalog" className="ml-auto text-green-600 hover:text-green-700 text-xs font-medium">Каталог →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" /> Выполнение задач
          </h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all"
                style={{ width: `${summary.completionRate}%` }}
              />
            </div>
            <span className="text-sm font-medium">{summary.completionRate}%</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              <span>Выполнено: {summary.completedTasks}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Активных: {summary.pendingTasks}</span>
            </div>
            {summary.overdueTasks > 0 && (
              <div className="flex items-center gap-2 col-span-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-red-600">Просрочено: {summary.overdueTasks}</span>
              </div>
            )}
          </div>
          <Link
            to="/reminders"
            className="inline-block mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Открыть календарь задач →
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" /> Топ культур
          </h3>
          <p className="text-xs text-gray-400 mb-3">По числу посадок на грядках</p>
          {summary.topPlants.length === 0 ? (
            <p className="text-gray-400 text-sm">Пока нет посадок</p>
          ) : (
            <div className="space-y-2">
              {summary.topPlants.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-300 w-6">{i + 1}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full flex items-center px-3 text-xs text-white font-medium min-w-[2rem]"
                      style={{ width: `${(count / summary.topPlants[0][1]) * 100}%` }}
                    >
                      {name}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{count} шт.</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" /> История в дневнике
          </h3>
          {recentJournal.length === 0 ? (
            <p className="text-gray-400 text-sm">События появятся после посева, пересадки или записи в дневник</p>
          ) : (
            <ul className="space-y-2">
              {recentJournal.map((entry) => (
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

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" /> Выполнено задач за 6 месяцев
          </h3>
          {monthlyCompleted.length === 0 ? (
            <p className="text-gray-400 text-sm">Отмечайте задачи выполненными — здесь появится график</p>
          ) : (
            <>
              <div className="flex items-end gap-2 h-28">
                {monthlyCompleted.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] text-gray-500 font-medium">{m.completed}</span>
                    <div
                      className="w-full bg-green-500 rounded-t transition-all"
                      style={{ height: `${(m.completed / maxCompleted) * 100}%`, minHeight: m.completed > 0 ? 4 : 0 }}
                    />
                    <span className="text-[10px] text-gray-500">{m.monthLabel}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">По дате выполнения задачи</p>
            </>
          )}
        </div>
      </div>

      {yearlyStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" /> События по годам
          </h3>
          <div className="space-y-3">
            {yearlyStats.map((year) => (
              <div key={year.year} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center font-bold text-indigo-600 shrink-0">
                  {year.year}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{year.count} {year.count === 1 ? 'событие' : year.count < 5 ? 'события' : 'событий'}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {year.labels.slice(0, 4).join(', ')}{year.labels.length > 4 ? '…' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-4 sm:p-6">
        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <Sprout className="w-5 h-5 text-green-600" /> Рекомендации
        </h3>
        <ul className="text-sm text-gray-600 space-y-1.5">
          {recommendations.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
