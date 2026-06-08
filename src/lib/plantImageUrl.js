/** URL картинки через same-origin прокси /supabase (storage + legacy). */
export function resolvePlantImageUrl(url) {
  if (!url || typeof url !== 'string') return null

  if (url.startsWith('/supabase/')) {
    return `${window.location.origin}${url}`
  }

  try {
    const parsed = new URL(url)
    if (parsed.pathname.includes('/storage/v1/object/public/')) {
      return `${window.location.origin}/supabase${parsed.pathname}${parsed.search}`
    }
  } catch {
    return url
  }

  return url
}

export function isStorageImageUrl(url) {
  if (!url) return false
  return /\/storage\/v1\/object\/public\/(plant-images|garden-photos)\//.test(url)
}
