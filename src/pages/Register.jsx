import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from '../store/toastStore'
import AuthLayout from '../components/AuthLayout'
import PasswordInput, { authInputClass } from '../components/PasswordInput'

export default function Register() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canSubmit = acceptedTerms && acceptedPrivacy

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Необходимо принять пользовательское соглашение и дать согласие на обработку персональных данных')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов')
      setLoading(false)
      return
    }

    if (password !== passwordConfirm) {
      setError('Пароли не совпадают')
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
          <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1.5">Имя</label>
          <input
            id="reg-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={authInputClass}
            placeholder="Как вас зовут"
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            placeholder="your@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
          <PasswordInput
            id="reg-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 6 символов"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>

        <div>
          <label htmlFor="reg-password-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
            Повторите пароль
          </label>
          <PasswordInput
            id="reg-password-confirm"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Ещё раз пароль"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 shrink-0"
            />
            <span className="text-sm text-gray-600 leading-snug">
              Я принимаю{' '}
              <Link
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 font-medium underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                пользовательское соглашение
              </Link>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 shrink-0"
            />
            <span className="text-sm text-gray-600 leading-snug">
              Я даю{' '}
              <Link
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 font-medium underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                согласие на обработку персональных данных
              </Link>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>
    </AuthLayout>
  )
}
