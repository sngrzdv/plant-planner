import { Link } from 'react-router-dom'
import { Sprout } from 'lucide-react'

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="page-shell min-h-[100dvh] flex flex-col bg-white sm:bg-gradient-to-br sm:from-green-50 sm:to-emerald-100">
      <div className="flex-1 flex flex-col sm:items-center sm:justify-center sm:p-6">
        <div className="flex flex-col w-full sm:max-w-md sm:rounded-2xl sm:shadow-xl sm:overflow-hidden sm:bg-white">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-6 pt-[max(2.5rem,env(safe-area-inset-top,0px))] pb-8 sm:pt-8 sm:pb-6 text-white sm:text-center">
            <Link to="/login" className="inline-flex items-center gap-3 sm:flex-col sm:gap-2">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
                <Sprout className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="sm:mt-1">
                <p className="text-lg sm:text-xl font-bold leading-tight">Plant Planner</p>
                <p className="text-sm text-green-100 mt-1 sm:mt-2">{subtitle}</p>
              </div>
            </Link>
            {title && (
              <h1 className="mt-6 text-2xl font-bold tracking-tight sm:mt-4">{title}</h1>
            )}
          </div>

          <div className="flex-1 px-6 py-6 sm:py-8">
            {children}
          </div>

          {footer && (
            <div className="px-6 pb-8 pt-0 sm:pb-8 border-t border-gray-100 sm:border-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
