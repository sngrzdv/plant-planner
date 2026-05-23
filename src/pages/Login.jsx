import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Sprout } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { loadProfile } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Неверный email или пароль')
      } else if (error.message.includes('Email not confirmed')) {
        setError('Email не подтверждён. Проверьте почту.')
      } else {
        setError('Ошибка входа: ' + error.message)
      }
      setLoading(false)
    } else {
      // Успешный вход
      await loadProfile(data.user.id)
      navigate('/dashboard')
    }
    if (data?.user) {
      // Проверяем, не заблокирован ли пользователь
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('id', data.user.id)
        .single()
      
      if (profile?.is_blocked) {
        await supabase.auth.signOut()
        setError('Ваш аккаунт заблокирован администратором')
        setLoading(false)
        return
      }
      
      await loadProfile(data.user.id)
      navigate('/dashboard')
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-md">
        
        {/* Логотип и заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Sprout className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Plant Planner</h1>
          <p className="text-gray-600 mt-2">Войдите в свой аккаунт</p>
        </div>
        
        {/* Сообщение об ошибке */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {/* Форма входа */}
        <form onSubmit={handleLogin} className="space-y-4">
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
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        
        {/* Ссылка на регистрацию */}
        <p className="text-center mt-6 text-gray-600">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">
            Зарегистрироваться
          </Link>
        </p>
        
        <p className="text-center mt-2">
          <button onClick={() => alert('Восстановление пароля пока недоступно')} 
            className="text-sm text-gray-400 hover:text-green-600">
            Забыли пароль?
          </button>
        </p>
      </div>
    </div>
  )
}