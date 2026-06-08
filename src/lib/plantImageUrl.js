const STORAGE_MARKER = '/storage/v1/object/public/'

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

/** URL для <img>: same-origin прокси /supabase. */
export function resolvePlantImageUrl(url) {
  if (!url || typeof url !== 'string') return null

  const path = extractStoragePublicPath(url)
  if (path) {
    return `${window.location.origin}/supabase${path}`
  }

  if (url.startsWith('/supabase/')) {
    return `${window.location.origin}${url}`
  }

  return url
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
