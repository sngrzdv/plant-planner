import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from '../store/toastStore'
import AuthLayout from '../components/AuthLayout'

const inputClass =
  'w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-colors'

export default function Register() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Пользователь с таким email уже существует')
      } else {
        setError(signUpError.message)
      }
    } else if (data?.user?.identities?.length > 0) {
      const msg = 'Регистрация успешна! Сейчас вы будете перенаправлены.'
      setSuccess(msg)
      toast.success(msg)
      setTimeout(() => navigate('/login'), 1500)
    } else {
      const msg = 'Регистрация успешна! Проверьте почту для подтверждения.'
      setSuccess(msg)
      toast.success(msg)
      setTimeout(() => navigate('/login'), 2000)
    }

    setLoading(false)
  }

  return (
    <AuthLayout
      title="Регистрация"
      subtitle="Начните вести огород в одном месте"
      footer={
        <p className="text-center text-gray-600 text-sm">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
            Войти
          </Link>
        </p>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100">
          {success}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Как вас зовут"
            autoComplete="name"
            required
          />
        </div>

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
            placeholder="Минимум 6 символов"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>
    </AuthLayout>
  )
}
