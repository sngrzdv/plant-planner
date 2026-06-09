import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthLayout from '../components/AuthLayout'

const inputClass =
  'w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-colors disabled:opacity-50'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingLink, setCheckingLink] = useState(true)
  const [validSession, setValidSession] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const initRecovery = async () => {
      setCheckingLink(true)
      setError('')

      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            if (active) {
              setError('Ссылка недействительна или устарела. Запросите восстановление ещё раз.')
            }
            return
          }
          window.history.replaceState({}, document.title, '/reset-password')
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!active) return

        if (session) {
          setValidSession(true)
          return
        }

        setError('Ссылка недействительна или устарела. Запросите восстановление ещё раз.')
      } catch {
        if (active) {
          setError('Не удалось проверить ссылку. Попробуйте запросить письмо снова.')
        }
      } finally {
        if (active) setCheckingLink(false)
      }
    }

    initRecovery()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setValidSession(true)
        setError('')
        setCheckingLink(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов')
      return
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(`Не удалось обновить пароль: ${updateError.message}`)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setMessage('Пароль обновлён. Сейчас перейдём на страницу входа.')
    setLoading(false)
    setTimeout(() => navigate('/login'), 1200)
  }

  return (
    <AuthLayout
      title="Новый пароль"
      subtitle="Восстановление доступа"
      footer={
        <p className="text-center text-gray-600 text-sm">
          <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
            Вернуться ко входу
          </Link>
        </p>
      }
    >
      {checkingLink && (
        <div className="mb-4 flex justify-center py-4">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100">
          {message}
        </div>
      )}

      {!checkingLink && error && !validSession && (
        <Link
          to="/login"
          className="block w-full text-center bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-medium mb-4"
        >
          Запросить новую ссылку
        </Link>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Новый пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Минимум 6 символов"
            minLength={6}
            required
            disabled={!validSession || loading || checkingLink}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Повторите пароль</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            placeholder="Повторите пароль"
            minLength={6}
            required
            disabled={!validSession || loading || checkingLink}
          />
        </div>

        <button
          type="submit"
          disabled={!validSession || loading || checkingLink}
          className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
        >
          {loading ? 'Сохранение...' : 'Сохранить новый пароль'}
        </button>
      </form>
    </AuthLayout>
  )
}
