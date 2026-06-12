import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react'
import { ONBOARDING_STEPS } from '../content/onboardingSteps'
import { markOnboardingCompleted } from '../lib/onboardingStorage'

export default function AppOnboarding({ userId, userName, onClose }) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = ONBOARDING_STEPS[stepIndex]
  const Icon = step.icon
  const isFirst = stepIndex === 0
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1
  const progress = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100

  function finish() {
    markOnboardingCompleted(userId)
    onClose?.()
  }

  function goNext() {
    if (isLast) {
      finish()
      return
    }
    setStepIndex((i) => i + 1)
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/50 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-[1.75rem] sm:rounded-[1.75rem] shadow-2xl max-h-[94dvh] flex flex-col overflow-hidden ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`relative bg-gradient-to-br ${step.accent} px-6 pt-6 pb-8 text-white shrink-0`}>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
                <span aria-hidden>{step.emoji}</span>
                Шаг {stepIndex + 1} из {ONBOARDING_STEPS.length}
              </span>
              {isFirst && userName && (
                <p className="text-sm text-white/90 font-medium">
                  Рады видеть вас, {userName}!
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={finish}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors shrink-0"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mt-5 flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center ring-1 ring-white/30">
              <Icon className="w-8 h-8 text-white" aria-hidden />
            </div>
            <h2 id="onboarding-title" className="text-xl sm:text-2xl font-bold leading-tight pr-2">
              {step.title}
            </h2>
          </div>
          <div className="relative mt-5 h-1 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>

          {step.tips?.length > 0 && (
            <ul className="space-y-2.5">
              {step.tips.map((tip, i) => (
                <li
                  key={tip}
                  className="flex items-start gap-3 text-sm text-gray-700 bg-gradient-to-r from-gray-50 to-green-50/40 rounded-xl px-3.5 py-3 border border-gray-100"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" aria-hidden />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}

          {step.link && (
            <Link
              to={step.link.to}
              onClick={finish}
              className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-4 py-2.5 rounded-xl transition-colors"
            >
              {step.link.label}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          )}
        </div>

        <div className="shrink-0 px-6 pb-6 pt-2 flex items-center gap-2 border-t border-gray-100">
          {!isFirst ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden />
              Назад
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Пропустить
            </button>
          )}

          <button
            type="button"
            onClick={goNext}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-md shadow-green-600/20 transition-all active:scale-[0.98]"
          >
            {isLast ? 'Начать работу' : 'Далее'}
            {!isLast && <ChevronRight className="w-4 h-4" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  )
}
