import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Sprout } from 'lucide-react'
import { PRIVACY_POLICY, USER_AGREEMENT } from '../content/legalTexts'

const DOCS = {
  terms: USER_AGREEMENT,
  privacy: PRIVACY_POLICY,
}

export default function LegalPage({ doc }) {
  const location = useLocation()
  const key = doc || (location.pathname.includes('privacy') ? 'privacy' : 'terms')
  const content = DOCS[key] || USER_AGREEMENT

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <header className="bg-white/90 backdrop-blur border-b border-green-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Link>
          <div className="flex items-center gap-2 ml-auto text-green-800">
            <Sprout className="w-5 h-5" />
            <span className="font-semibold text-sm">Мой огород</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{content.title}</h1>
        <p className="text-sm text-gray-500 mb-8">Редакция от {content.updated}</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{section.heading}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">
            Вернуться к регистрации
          </Link>
          {' · '}
          <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
            Войти
          </Link>
        </p>
      </main>
    </div>
  )
}
