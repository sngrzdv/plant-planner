import { useState, useEffect } from 'react'
import { ImageOff } from 'lucide-react'
import { resolvePlantImageUrl } from '../lib/plantImageUrl'

const SIZE_PRESETS = {
  thumb: { width: 64, height: 64 },
  card: { width: 400, height: 176 },
  detail: { width: 800, height: 600 },
}

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
  size,
}) {
  const [failed, setFailed] = useState(false)
  const [useFullSize, setUseFullSize] = useState(false)
  const dimensions = size ? SIZE_PRESETS[size] : null
  const resolved = resolvePlantImageUrl(src, useFullSize ? {} : (dimensions || {}))

  useEffect(() => {
    setFailed(false)
    setUseFullSize(false)
  }, [src, size])

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
      fetchPriority="low"
      width={dimensions?.width}
      height={dimensions?.height}
      onError={() => {
        if (dimensions && !useFullSize) {
          setUseFullSize(true)
          return
        }
        setFailed(true)
      }}
    />
  )
}
