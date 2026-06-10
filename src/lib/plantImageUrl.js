import { resolveSupabasePublicUrl, shouldUseSupabaseProxy } from './supabaseProxy'

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

/**
 * URL для <img>.
 * На production — через /supabase (same-origin, без блокировок в РФ).
 * Локально — напрямую с CDN Supabase.
 */
export function resolvePlantImageUrl(url, { width, height } = {}) {
  if (!url || typeof url !== 'string') return null

  const normalized = url.replace(/\/supabase\/supabase\//g, '/supabase/')
  const path = extractStoragePublicPath(normalized)

  if (path) {
    if (width || height) {
      const renderPath = path.replace(STORAGE_MARKER, '/storage/v1/render/image/public/')
      const params = new URLSearchParams()
      if (width) params.set('width', String(Math.round(width)))
      if (height) params.set('height', String(Math.round(height)))
      params.set('resize', 'cover')
      params.set('quality', '75')
      return resolveSupabasePublicUrl(`${renderPath}?${params}`)
    }

    return resolveSupabasePublicUrl(path)
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

export { shouldUseSupabaseProxy }
