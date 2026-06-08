import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractStoragePublicPath, resolvePlantImageUrl } from './plantImageUrl'

describe('plantImageUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } })
    vi.stubGlobal('import', { meta: { env: { VITE_SUPABASE_URL: 'https://abc.supabase.co' } } })
  })

  it('extracts storage path from supabase URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/plant-images/foo.jpg'
    expect(extractStoragePublicPath(url)).toBe('/storage/v1/object/public/plant-images/foo.jpg')
  })

  it('returns null for empty url', () => {
    expect(extractStoragePublicPath(null)).toBeNull()
  })

  it('resolves storage URL via local proxy', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/plant-images/foo.jpg'
    expect(resolvePlantImageUrl(url)).toBe(
      'http://localhost:5173/supabase/storage/v1/object/public/plant-images/foo.jpg',
    )
  })
})
