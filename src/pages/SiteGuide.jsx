import { Link } from 'react-router-dom'
import {
  Sprout,
  Map,
  Flower2,
  CalendarCheck,
  Moon,
  CloudSun,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import { SITE_META } from '../content/siteGuideContent'

const FEATURES = [
  {
    icon: Map,
    title: 'План участка',
    text: 'Рисуйте грядки, клумбы, теплицу, деревья и кусты на интерактивной карте. Всё вашего огорода — на одном экране.',
  },
  {
    icon: Sprout,
    title: 'Рассада',
    text: 'Отмечайте посевы, следите за готовностью к пересадке и переносите растения на грядку в пару кликов.',
  },
  {
    icon: BookOpen,
    title: 'Каталог культур',
    text: 'Справочник овощей, зелени, цветов и ягод с подсказками по поливу, срокам созревания и способу посадки.',
  },
  {
    icon: CalendarCheck,
    title: 'Задачи и напоминания',
    text: 'После посадки приложение само составит график полива, подкормки и сбора урожая — по параметрам выбранной культуры.',
  },
  {
    icon: Moon,
    title: 'Лунный календарь',
    text: 'Смотрите благоприятные дни для посадки и ухода с учётом фаз Луны.',
  },
  {
    icon: CloudSun,
    title: 'Погода',
    text: 'На главной — актуальная погода для вашего города, чтобы планировать работы на участке.',
  },
]

const STEPS = [
  'Зарегистрируйтесь или войдите в аккаунт',
  'Создайте участок и расставьте зоны на плане',
  'Посадите рассаду или растения на грядках',
  'Выполняйте задачи из календаря ухода',
]

export default function SiteGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/80 to-gray-50 text-gray-800">
      <header className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Sprout className="w-5 h-5 text-green-600" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{SITE_META.name}</h1>
              <p className="text-xs text-gray-500">О приложении</p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl transition-colors"
          >
            Войти
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        <section className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl">
            <Flower2 className="w-8 h-8 text-green-600" aria-hidden />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Ваш огород — под контролем
          </h2>
          <p className="text-gray-600 leading-relaxed max-w-xl mx-auto">
            {SITE_META.audience} Всё в одном месте: план, рассада, справочник и календарь дел.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-2 hover:border-green-100 transition-colors"
            >
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Icon className="w-5 h-5 text-green-600" aria-hidden />
              </div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
            </article>
          ))}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">С чего начать</h2>
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-green-700 hover:text-green-800"
          >
            Создать аккаунт
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </section>

        <section className="text-center bg-green-600 rounded-2xl p-8 text-white space-y-4">
          <h2 className="text-xl font-bold">Готовы начать?</h2>
          <p className="text-green-100 text-sm max-w-md mx-auto">
            Бесплатная регистрация займёт минуту. После входа вы сразу сможете создать свой первый участок.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-green-700 font-medium px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
            >
              Зарегистрироваться
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 border border-white/40 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              Войти
            </Link>
          </div>
        </section>
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-8 text-center text-sm text-gray-400 space-y-2">
        <p>
          <Link to="/login" className="text-green-600 hover:underline">
            Войти
          </Link>
          {' · '}
          <Link to="/register" className="text-green-600 hover:underline">
            Регистрация
          </Link>
          {' · '}
          <Link to="/terms" className="hover:underline">
            Соглашение
          </Link>
          {' · '}
          <Link to="/privacy" className="hover:underline">
            Конфиденциальность
          </Link>
        </p>
      </footer>
    </div>
  )
}
