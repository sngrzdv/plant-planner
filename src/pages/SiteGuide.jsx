import { Link } from 'react-router-dom'
import { Sprout, ExternalLink, BookOpen } from 'lucide-react'
import {
  SITE_META,
  AUTH_NOTE,
  ROUTES,
  NAVIGATION,
  DATA_FLOW,
  FOR_AI,
} from '../content/siteGuideContent'

export default function SiteGuide() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <Sprout className="w-5 h-5 text-green-600" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{SITE_META.name}</h1>
              <p className="text-xs text-gray-500">Справочник сайта для обзора и ИИ</p>
            </div>
          </div>
          <Link
            to="/login"
            className="text-sm font-medium text-green-700 hover:text-green-800 whitespace-nowrap"
          >
            Войти →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-xl font-bold">О приложении</h2>
          <p className="text-gray-600 leading-relaxed">{SITE_META.audience}</p>
          <p className="text-sm text-gray-500">
            <strong>Стек:</strong> {SITE_META.stack}
          </p>
          <p className="text-sm">
            <strong>Production:</strong>{' '}
            <a
              href={SITE_META.productionUrl}
              className="text-green-700 hover:underline inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              {SITE_META.productionUrl}
              <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </a>
          </p>
          <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{AUTH_NOTE}</p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-600" aria-hidden />
            Все страницы ({ROUTES.length})
          </h2>
          <div className="space-y-4">
            {ROUTES.map((route) => (
              <article
                key={route.path}
                id={route.path.replace(/[/:]/g, '-')}
                className="border border-gray-100 rounded-xl p-4"
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <code className="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{route.path}</code>
                  <span className="font-semibold">{route.title}</span>
                  {route.auth ? (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">вход</span>
                  ) : (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">публично</span>
                  )}
                  {route.role && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{route.role}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{route.summary}</p>
                {route.redirect && (
                  <p className="text-xs text-gray-400 mt-1">→ {route.redirect}</p>
                )}
                {route.blocks?.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-0.5">
                    {route.blocks.map((block) => (
                      <li key={block}>{block}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-xl font-bold">Навигация</h2>
          <p className="text-sm text-gray-600">
            <strong>Десктоп:</strong> {NAVIGATION.desktop.join(', ')}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Мобильная:</strong> {NAVIGATION.mobile}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Профиль:</strong> {NAVIGATION.profile}
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-xl font-bold">Данные и архитектура</h2>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            {DATA_FLOW.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="bg-green-50 border border-green-100 rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-green-900">Для ИИ-ассистентов</h2>
          <p className="text-sm text-green-900">
            Эта страница доступна без авторизации, чтобы модели и поисковые агенты могли прочитать полное
            описание интерфейса. Исходный код: {FOR_AI.howToExploreCode}
          </p>
          <p className="text-sm text-green-900">{FOR_AI.howToExploreLive}</p>
          <p className="text-sm text-green-800">
            Документация в репозитории: {FOR_AI.repoDocs.join(', ')}
          </p>
        </section>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
        <Link to="/login" className="text-green-600 hover:underline">
          Войти в приложение
        </Link>
        {' · '}
        <Link to="/terms" className="hover:underline">
          Соглашение
        </Link>
        {' · '}
        <Link to="/privacy" className="hover:underline">
          Конфиденциальность
        </Link>
      </footer>
    </div>
  )
}
