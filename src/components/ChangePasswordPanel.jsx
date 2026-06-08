import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getResetPasswordUrl } from '../lib/siteUrl'
import { toast } from '../store/toastStore'
import {
  KeyRound, Eye, EyeOff, Mail, CheckCircle2, ArrowRight, ArrowLeft,
  ShieldCheck, Loader2,
} from 'lucide-react'

function passwordChecks(password) {
  return {
    length: password.length >= 6,
    letter: /[a-zA-Zа-яА-Я]/.test(password),
    digit: /\d/.test(password),
  }
}

function strengthLabel(checks) {
  const score = [checks.length, checks.letter, checks.digit].filter(Boolean).length
  if (score <= 1) return { text: 'Слабый', color: 'bg-red-400', width: '33%' }
  if (score === 2) return { text: 'Средний', color: 'bg-amber-400', width: '66%' }
  return { text: 'Надёжный', color: 'bg-green-500', width: '100%' }
}

export default function ChangePasswordPanel({ email }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('verify') // verify | new | done | forgot-sent
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  function resetForm() {
    setStep('verify')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
  }

  function closePanel() {
    setOpen(false)
    resetForm()
  }

  async function verifyCurrentPassword(e) {
    e.preventDefault()
    if (!currentPassword) {
      toast.error('Введите текущий пароль')
      return
    }
    if (!email) {
      toast.error('Email аккаунта не найден')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    setLoading(false)

    if (error) {
      toast.error('Неверный текущий пароль')
      return
    }

    setStep('new')
  }

  async function sendResetEmail() {
    if (!email) {
      toast.error('Email аккаунта не найден')
      return
    }

    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getResetPasswordUrl(),
    })
    setResetLoading(false)

    if (error) {
      toast.error(`Не удалось отправить письмо: ${error.message}`)
      return
    }

    setStep('forgot-sent')
    toast.success('Ссылка для сброса отправлена на почту')
  }

  async function saveNewPassword(e) {
    e.preventDefault()
    const checks = passwordChecks(newPassword)

    if (!checks.length) {
      toast.error('Пароль должен быть минимум 6 символов')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают')
      return
    }
    if (currentPassword && newPassword === currentPassword) {
      toast.error('Новый пароль должен отличаться от текущего')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (error) {
      toast.error(`Не удалось обновить пароль: ${error.message}`)
      return
    }

    setStep('done')
    toast.success('Пароль успешно изменён')
  }

  const checks = passwordChecks(newPassword)
  const strength = strengthLabel(checks)
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword

  const stepNumber = step === 'verify' ? 1 : step === 'new' ? 2 : step === 'done' ? 3 : null

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" /> Безопасность
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Смена пароля с подтверждением текущего или восстановлением по email
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
          >
            <KeyRound className="w-4 h-4" /> Сменить
          </button>
        )}
      </div>

      {open && (
        <div className="mt-5 border border-gray-100 rounded-2xl overflow-hidden">
          {step !== 'forgot-sent' && (
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <StepDot active={stepNumber >= 1} done={stepNumber > 1} n={1} />
              <div className="flex-1 h-px bg-gray-200" />
              <StepDot active={stepNumber >= 2} done={stepNumber > 2} n={2} />
              <div className="flex-1 h-px bg-gray-200" />
              <StepDot active={stepNumber >= 3} done={step === 'done'} n={3} />
            </div>
          )}

          <div className="p-4 sm:p-5">
            {step === 'verify' && (
              <form onSubmit={verifyCurrentPassword} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-1">Шаг 1 — Подтвердите личность</p>
                  <p className="text-xs text-gray-500">Введите текущий пароль, чтобы продолжить</p>
                </div>

                <PasswordField
                  label="Текущий пароль"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showCurrent}
                  onToggleShow={() => setShowCurrent((v) => !v)}
                  placeholder="Ваш действующий пароль"
                  autoComplete="current-password"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? 'Проверка...' : 'Продолжить'}
                </button>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Не помните пароль?</p>
                  <button
                    type="button"
                    onClick={sendResetEmail}
                    disabled={resetLoading}
                    className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                  >
                    {resetLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Отправить ссылку на {email || 'email'}
                  </button>
                  <p className="text-[11px] text-gray-400 mt-2">
                    Ссылка придёт на почту. После перехода по ней вы зададите новый пароль на отдельной странице.
                  </p>
                </div>
              </form>
            )}

            {step === 'forgot-sent' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Письмо отправлено</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Проверьте <strong>{email}</strong> и перейдите по ссылке для сброса пароля.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Ссылка действует ограниченное время. Проверьте папку «Спам».</p>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Закрыть
                </button>
              </div>
            )}

            {step === 'new' && (
              <form onSubmit={saveNewPassword} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-1">Шаг 2 — Новый пароль</p>
                  <p className="text-xs text-gray-500">Придумайте пароль и повторите его для проверки</p>
                </div>

                <PasswordField
                  label="Новый пароль"
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNew}
                  onToggleShow={() => setShowNew((v) => !v)}
                  placeholder="Минимум 6 символов"
                  autoComplete="new-password"
                />

                {newPassword.length > 0 && (
                  <div className="space-y-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all`} style={{ width: strength.width }} />
                    </div>
                    <p className="text-xs text-gray-500">Надёжность: {strength.text}</p>
                    <ul className="text-xs space-y-0.5">
                      <CheckItem ok={checks.length} text="Не менее 6 символов" />
                      <CheckItem ok={checks.letter} text="Есть буквы" />
                      <CheckItem ok={checks.digit} text="Есть цифры" />
                    </ul>
                  </div>
                )}

                <PasswordField
                  label="Повторите пароль"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirm}
                  onToggleShow={() => setShowConfirm((v) => !v)}
                  placeholder="Ещё раз новый пароль"
                  autoComplete="new-password"
                />

                {confirmPassword.length > 0 && (
                  <p className={`text-xs flex items-center gap-1 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                    {passwordsMatch ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    {passwordsMatch ? 'Пароли совпадают' : 'Пароли не совпадают'}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('verify')}
                    className="flex items-center justify-center gap-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4" /> Назад
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !checks.length || !passwordsMatch}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {loading ? 'Сохранение...' : 'Сохранить пароль'}
                  </button>
                </div>
              </form>
            )}

            {step === 'done' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Пароль обновлён</p>
                  <p className="text-sm text-gray-500 mt-1">Используйте новый пароль при следующем входе</p>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
                >
                  Готово
                </button>
              </div>
            )}
          </div>

          {step !== 'done' && step !== 'forgot-sent' && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button type="button" onClick={closePanel} className="text-sm text-gray-500 hover:text-gray-700">
                Отмена
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StepDot({ active, done, n }) {
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
        done ? 'bg-green-600 text-white' : active ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-gray-200 text-gray-500'
      }`}
    >
      {done ? <CheckCircle2 className="w-4 h-4" /> : n}
    </div>
  )
}

function PasswordField({ label, value, onChange, show, onToggleShow, placeholder, autoComplete }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

function CheckItem({ ok, text }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
      <CheckCircle2 className={`w-3.5 h-3.5 ${ok ? '' : 'opacity-40'}`} />
      {text}
    </li>
  )
}
