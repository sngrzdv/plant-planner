import { useState } from 'react'
import { Sprout } from 'lucide-react'
import { resolvePlantImageUrl } from '../lib/plantImageUrl'

export default function PlantImage({
  src,
  alt = '',
  className = '',
  fallbackIcon,
  fallbackClassName = '',
}) {
  const [failed, setFailed] = useState(false)
  const resolved = resolvePlantImageUrl(src)

  if (!resolved || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${fallbackClassName || className}`}>
        {fallbackIcon
          ? <span className="text-2xl" aria-hidden="true">{fallbackIcon}</span>
          : <Sprout className="w-8 h-8 text-gray-400" aria-hidden="true" />}
      </div>
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
