import { useState } from 'react'
import { Heart } from 'lucide-react'
import { toast } from '../store/toastStore'

export default function FavoriteButton({
  plantId,
  isFavorite,
  onToggle,
  size = 'md',
  className = '',
}) {
  const [loading, setLoading] = useState(false)

  const iconClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const btnClass = size === 'sm' ? 'p-1.5' : 'p-2'

  async function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()
    if (loading || !onToggle) return
    setLoading(true)
    try {
      const added = await onToggle(plantId)
      toast.success(added ? 'Добавлено в избранное' : 'Убрано из избранного')
    } catch (err) {
      toast.error(err.message || 'Не удалось обновить избранное')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
      aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      className={`${btnClass} rounded-full backdrop-blur-sm transition-colors disabled:opacity-50 ${
        isFavorite
          ? 'bg-red-100/90 text-red-600 hover:bg-red-200/90'
          : 'bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white'
      } ${className}`}
    >
      <Heart className={`${iconClass} ${isFavorite ? 'fill-current' : ''}`} />
    </button>
  )
}
