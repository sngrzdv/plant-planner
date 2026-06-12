import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'
import { journalActionLabel } from '../lib/plantLabels'

export default function PotsJournal() {
  const { user } = useAuthStore()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadHistory = useCallback(async () => {
    if (!user?.id) return
    setLoadError('')
    setLoading(true)
    const { data, error } = await supabase
      .from('garden_journal')
      .select('*, plants:plant_id(name), pots:pot_id(custom_name), user_plants:user_plant_id(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      setLoadError(error.message)
      setHistory([])
    } else {
      setHistory(data || [])
    }
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  function entryTitle(entry) {
    return entry.plants?.name || entry.user_plants?.name || entry.pots?.custom_name || 'Растение'
  }

  return (
    <div className="page-shell min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0">
      <Header />
      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/pots"
            className="p-2 hover:bg-white rounded-xl transition-colors text-gray-600"
            aria-label="Назад к рассадам"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-green-600" />
              Журнал действий
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Посевы, пересадки и записи из дневника</p>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Пока нет записей</p>
            <Link to="/pots" className="inline-block mt-4 text-sm text-green-600 hover:text-green-700 font-medium">
              Перейти к рассадам →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <article key={entry.id} className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 border border-gray-100">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    {journalActionLabel(entry.action)}
                  </span>
                  <span className="font-semibold text-gray-800">{entryTitle(entry)}</span>
                </div>
                {entry.details && (
                  <p className="text-sm text-gray-600 leading-relaxed">{entry.details}</p>
                )}
                <time className="text-xs text-gray-400 mt-2 block">
                  {new Date(entry.created_at).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </article>
            ))}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
