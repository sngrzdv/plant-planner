import { useState, useEffect } from 'react'
import { ImageOff } from 'lucide-react'
import { resolvePlantImageUrl } from '../lib/plantImageUrl'

function NoPhotoPlaceholder({ className, label = 'Нет фото', compact = false }) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 ${
        compact ? 'gap-0' : 'flex-col gap-1.5'
      } ${className}`}
      role="img"
      aria-label={label}
    >
      <ImageOff
        className={compact ? 'w-3.5 h-3.5 opacity-60' : 'w-8 h-8 opacity-60'}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      {!compact && (
        <span className="text-[11px] font-medium tracking-wide uppercase opacity-70">{label}</span>
      )}
    </div>
  )
}

export default function PlantImage({
  src,
  alt = '',
  className = '',
  fallbackClassName = '',
  fallbackLabel = 'Нет фото',
  compact = false,
}) {
  const [failed, setFailed] = useState(false)
  const resolved = resolvePlantImageUrl(src)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!resolved || failed) {
    return (
      <NoPhotoPlaceholder
        className={fallbackClassName || className}
        label={fallbackLabel}
        compact={compact}
      />
    )
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
