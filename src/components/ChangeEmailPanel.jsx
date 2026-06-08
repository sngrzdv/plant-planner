import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../store/toastStore'
import { Mail, ArrowRight, Loader2 } from 'lucide-react'

export default function ChangeEmailPanel({ currentEmail }) {
  const [open, setOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  function close() {
    setOpen(false)
    setNewEmail('')
    setSent(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed) {
      toast.error('Введите новый email')
      return
    }
    if (trimmed === currentEmail?.toLowerCase()) {
      toast.error('Это уже ваш текущий email')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ email: trimmed })
    setLoading(false)

    if (error) {
      toast.error(`Не удалось сменить email: ${error.message}`)
      return
    }

    setSent(true)
    toast.success('Письмо с подтверждением отправлено на новый адрес')
  }

  return (
    <div className="pt-4 border-t border-gray-100">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          Сменить email
        </button>
      ) : sent ? (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm">
          <p className="font-medium text-green-800">Проверьте почту</p>
          <p className="text-green-700 mt-1">
            На <strong>{newEmail}</strong> отправлено письмо. Подтвердите новый адрес — до этого вход остаётся через{' '}
            <strong>{currentEmail}</strong>.
          </p>
          <button type="button" onClick={close} className="mt-3 text-green-600 hover:text-green-700 font-medium">
            Закрыть
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-gray-600">
            Текущий: <strong>{currentEmail}</strong>
          </p>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Новый email"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20"
              required
            />
          </div>
          <p className="text-xs text-gray-400">
            Supabase отправит письмо для подтверждения на новый адрес
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Отправить подтверждение
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
