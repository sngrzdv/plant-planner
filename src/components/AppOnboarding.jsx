import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { ONBOARDING_STEPS } from '../content/onboardingSteps'
import { markOnboardingCompleted } from '../lib/onboardingStorage'

export default function AppOnboarding({ userId, userName, onClose }) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = ONBOARDING_STEPS[stepIndex]
  const Icon = step.icon
  const isFirst = stepIndex === 0
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1

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
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
          <div className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            Знакомство с приложением
          </div>
          <button
            type="button"
            onClick={finish}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">
          <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
            <Icon className="w-7 h-7 text-green-600" aria-hidden />
          </div>

          {isFirst && userName && (
            <p className="text-sm text-green-700 font-medium">
              Привет, {userName}! Пройдите короткий обзор — это займёт минуту.
            </p>
          )}

          <div>
            <h2 id="onboarding-title" className="text-xl font-bold text-gray-900 leading-snug">
              {step.title}
            </h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{step.description}</p>
          </div>

          {step.tips?.length > 0 && (
            <ul className="space-y-2">
              {step.tips.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2.5 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5"
                >
                  <span className="text-green-500 mt-0.5 shrink-0" aria-hidden>
                    •
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}

          {step.link && (
            <Link
              to={step.link.to}
              onClick={finish}
              className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800"
            >
              {step.link.label} →
            </Link>
          )}
        </div>

        <div className="shrink-0 px-5 pb-5 pt-3 space-y-3 border-t border-gray-100 mt-2">
          <div className="flex justify-center gap-1.5">
            {ONBOARDING_STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? 'w-6 bg-green-600' : 'w-1.5 bg-gray-200'
                }`}
                aria-hidden
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst ? (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden />
                Назад
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Пропустить
              </button>
            )}

            <button
              type="button"
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
            >
              {isLast ? 'Начать работу' : 'Далее'}
              {!isLast && <ChevronRight className="w-4 h-4" aria-hidden />}
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-400">
            Шаг {stepIndex + 1} из {ONBOARDING_STEPS.length}
          </p>
        </div>
      </div>
    </div>
  )
}
