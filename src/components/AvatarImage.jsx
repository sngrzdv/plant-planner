import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

export default function AvatarImage({
  src,
  alt = '',
  className = '',
  initial,
  iconClassName = 'w-4 h-4 text-green-600',
  initialClassName = 'text-2xl font-bold text-green-700',
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    if (initial) {
      return (
        <span className={`flex items-center justify-center w-full h-full ${initialClassName}`} aria-hidden="true">
          {initial}
        </span>
      )
    }
    return (
      <span className="flex items-center justify-center w-full h-full" aria-hidden="true">
        <User className={iconClassName} />
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
