const STORAGE_MARKER = '/storage/v1/object/public/'

function useImageProxy() {
  const proxyUrl = import.meta.env.VITE_SUPABASE_PROXY_URL
  return Boolean(proxyUrl && proxyUrl !== 'off' && proxyUrl !== 'false')
}

/** Путь в Storage из любого URL (supabase.co или /supabase/...). */
export function extractStoragePublicPath(url) {
  if (!url || typeof url !== 'string') return null
  const idx = url.indexOf(STORAGE_MARKER)
  if (idx === -1) return null
  return url.slice(idx)
}

/** В БД храним канонический URL на supabase.co — не зависит от прокси. */
export function toCanonicalStorageUrl(url) {
  if (!url) return null
  const path = extractStoragePublicPath(url)
  if (!path) return url

  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return url

  return `${base}${path}`
}

/**
 * URL для <img>.
 * По умолчанию — напрямую с CDN Supabase (быстрее, чем proxy dev-сервера).
 * Прокси только если явно включён VITE_SUPABASE_PROXY_URL.
 */
export function resolvePlantImageUrl(url, { width, height } = {}) {
  if (!url || typeof url !== 'string') return null

  const normalized = url.replace(/\/supabase\/supabase\//g, '/supabase/')
  const path = extractStoragePublicPath(normalized)

  if (path) {
    const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
    if (!base) return normalized

    if (width || height) {
      const renderPath = path.replace(STORAGE_MARKER, '/storage/v1/render/image/public/')
      const params = new URLSearchParams()
      if (width) params.set('width', String(Math.round(width)))
      if (height) params.set('height', String(Math.round(height)))
      params.set('resize', 'cover')
      params.set('quality', '75')
      return `${base}${renderPath}?${params}`
    }

    if (useImageProxy() && typeof window !== 'undefined') {
      const proxyBase = import.meta.env.VITE_SUPABASE_PROXY_URL.startsWith('/')
        ? import.meta.env.VITE_SUPABASE_PROXY_URL
        : '/supabase'
      return `${window.location.origin}${proxyBase}${path}`
    }

    return `${base}${path}`
  }

  if (normalized.startsWith('/supabase/') && typeof window !== 'undefined') {
    return `${window.location.origin}${normalized}`
  }

  return normalized
}

export function isStorageImageUrl(url) {
  if (!url) return false
  return /\/storage\/v1\/object\/public\/(plant-images|garden-photos)\//.test(url)
}

export function storageObjectPath(url, bucket) {
  const fullPath = extractStoragePublicPath(url)
  if (!fullPath) return null
  const prefix = `${STORAGE_MARKER}${bucket}/`
  if (!fullPath.startsWith(prefix)) return null
  return fullPath.slice(prefix.length).split('?')[0]
}
