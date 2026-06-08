import { Loader2, Check, AlertCircle } from 'lucide-react'

export default function AutoSaveIndicator({ status }) {
  if (status === 'idle') return null

  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Сохранение…
      </span>
    )
  }

  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
        <Check className="w-3.5 h-3.5" /> Сохранено
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-red-500">
      <AlertCircle className="w-3.5 h-3.5" /> Ошибка сохранения
    </span>
  )
}
