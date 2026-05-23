import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Sprout } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов')
      setLoading(false)
      return
    }
    
    // Регистрируем пользователя в Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName  // сохраняем имя в метаданных
        }
      }
    })
    
    if (error) {
      if (error.message.includes('already registered')) {
        setError('Пользователь с таким email уже существует')
      } else {
        setError(error.message)
      }
    } else {
      // Если подтверждение email не требуется — сразу входим
      if (data?.user?.identities?.length > 0) {
        alert('Регистрация успешна! Сейчас вы будете перенаправлены.')
        navigate('/login')
      } else {
        alert('Регистрация успешна! Проверьте почту для подтверждения.')
        navigate('/login')
      }
    }
    
    setLoading(false)
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Sprout className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Plant Planner</h1>
          <p className="text-gray-600 mt-2">Создайте новый аккаунт</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Иван Петров"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Минимум 6 символов"
              minLength={6}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-gray-600">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
            Войти
          </Link>
        </p>
        
      </div>
    </div>
  )
}