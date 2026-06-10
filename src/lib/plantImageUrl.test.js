import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractStoragePublicPath, resolvePlantImageUrl } from './plantImageUrl'
import { resolveSupabaseClientUrl, shouldUseSupabaseProxy } from './supabaseProxy'

describe('plantImageUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } })
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PROXY_URL', '')
  })

  it('extracts storage path from supabase URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/plant-images/foo.jpg'
    expect(extractStoragePublicPath(url)).toBe('/storage/v1/object/public/plant-images/foo.jpg')
  })

  it('returns null for empty url', () => {
    expect(extractStoragePublicPath(null)).toBeNull()
  })

  it('resolves storage URL directly in dev', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/plant-images/foo.jpg'
    expect(resolvePlantImageUrl(url)).toBe(
      'https://abc.supabase.co/storage/v1/object/public/plant-images/foo.jpg',
    )
  })

  it('builds thumbnail render URL when dimensions provided', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/plant-images/foo.jpg'
    expect(resolvePlantImageUrl(url, { width: 400, height: 176 })).toBe(
      'https://abc.supabase.co/storage/v1/render/image/public/plant-images/foo.jpg?width=400&height=176&resize=cover&quality=75',
    )
  })
})

describe('supabaseProxy', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'https://app.vercel.app' } })
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PROXY_URL', '/supabase')
  })

  it('uses same-origin proxy when enabled', () => {
    expect(shouldUseSupabaseProxy()).toBe(true)
    expect(resolveSupabaseClientUrl()).toBe('https://app.vercel.app/supabase')
  })
})
