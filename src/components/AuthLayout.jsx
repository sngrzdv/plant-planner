import { Link } from 'react-router-dom'
import { Sprout } from 'lucide-react'

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="page-shell min-h-[100dvh] bg-white sm:min-h-screen sm:flex sm:items-center sm:justify-center sm:bg-gradient-to-br sm:from-green-50 sm:to-emerald-100 sm:p-6">
      <div className="flex flex-col w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md sm:bg-white sm:rounded-xl sm:shadow-sm sm:p-8">
        {/* Мобильная шапка */}
        <div className="sm:hidden bg-gradient-to-br from-green-600 to-emerald-700 px-6 pt-[max(2.5rem,env(safe-area-inset-top,0px))] pb-8 text-white">
          <Link to="/login" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
              <Sprout className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">Мой огород</p>
              <p className="text-sm text-green-100 mt-1">{subtitle}</p>
            </div>
          </Link>
          {title && (
            <h1 className="mt-6 text-2xl font-bold tracking-tight">{title}</h1>
          )}
        </div>

        {/* Десктоп — классическая карточка */}
        <div className="hidden sm:block text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Sprout className="w-8 h-8 text-green-600" />
          </div>
          {title && <h1 className="text-2xl font-bold text-gray-800">{title}</h1>}
          {subtitle && <p className="text-gray-600 mt-2">{subtitle}</p>}
        </div>

        <div className="flex-1 px-6 py-6 sm:flex-none sm:p-0">
          {children}
        </div>

        {footer && (
          <div className="px-6 pb-8 pt-0 sm:px-0 sm:pb-0 sm:pt-6 border-t border-gray-100 sm:border-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
