import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getResetPasswordUrl } from '../lib/siteUrl'
import AuthLayout from '../components/AuthLayout'

const inputClass =
  'w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-colors'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [showResetForm, setShowResetForm] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError) {
      if (loginError.message.includes('Invalid login credentials')) {
        setError('Неверный email или пароль')
      } else if (loginError.message.includes('Email not confirmed')) {
        setError('Email не подтверждён. Проверьте почту.')
      } else {
        setError('Ошибка входа: ' + loginError.message)
      }
      setLoading(false)
    } else {
      navigate('/dashboard')
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setResetMessage('')

    if (!resetEmail.trim()) {
      setError('Введите email для восстановления')
      return
    }

    setResetLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: getResetPasswordUrl(),
    })

    if (resetError) {
      setError(`Ошибка отправки письма: ${resetError.message}`)
      setResetLoading(false)
      return
    }

    setResetMessage('Письмо отправлено. Проверьте почту и перейдите по ссылке для смены пароля.')
    setResetLoading(false)
  }

  return (
    <AuthLayout
      title="Вход"
      subtitle="Планируйте участок, рассаду и уход"
      footer={
        <p className="text-center text-gray-600 text-sm">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">
            Зарегистрироваться
          </Link>
        </p>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}
      {resetMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100">
          {resetMessage}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="your@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>

      <p className="text-center mt-5">
        <button
          type="button"
          onClick={() => {
            setShowResetForm((prev) => !prev)
            setResetEmail(email || '')
            setError('')
            setResetMessage('')
          }}
          className="text-sm text-gray-500 hover:text-green-600"
        >
          Забыли пароль?
        </button>
      </p>

      {showResetForm && (
        <form onSubmit={handleResetPassword} className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-100">
          <p className="text-sm text-gray-600">Укажите email — отправим ссылку для восстановления.</p>
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className={inputClass}
            placeholder="your@email.com"
            required
          />
          <button
            type="submit"
            disabled={resetLoading}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
          >
            {resetLoading ? 'Отправка...' : 'Отправить ссылку'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
