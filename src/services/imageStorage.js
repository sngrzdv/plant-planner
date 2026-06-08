import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { toCanonicalStorageUrl } from '../lib/plantImageUrl'
import { getSupabaseAuthConfig } from '../lib/supabaseAuthConfig'

const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const MAX_BYTES = 5 * 1024 * 1024
const RETRY_MS = [0, 800, 1600]

let directClient = null

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function usesProxy() {
  const proxy = import.meta.env.VITE_SUPABASE_PROXY_URL
  return Boolean(proxy && proxy !== '0' && proxy !== 'false')
}

function getDirectClient() {
  if (directClient) return directClient
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  directClient = createClient(url, key, {
    auth: getSupabaseAuthConfig(),
  })
  return directClient
}

function isNetworkError(error) {
  const msg = [error?.message, error?.details, error?.hint, error?.name]
    .filter(Boolean)
    .join(' ')
  return /fetch failed|ECONNRESET|502|503|network|timeout|Failed to fetch|aborted/i.test(msg)
}

function formatStorageError(error, bucket) {
  const raw = [error?.message, error?.error, error?.details, error?.hint]
    .filter(Boolean)
    .join(' — ')
  if (isNetworkError(error)) {
    return new Error(
      'Нет связи с Supabase Storage. Перезапустите npm run dev или попробуйте загрузку на Vercel / через VPN.'
    )
  }
  if (/bucket not found|not found/i.test(raw)) {
    return new Error(`Bucket «${bucket}» не найден. Выполните supabase/fix_storage_upload.sql`)
  }
  if (/mime|content type|not allowed|invalid/i.test(raw)) {
    return new Error(`Формат файла не принят Storage: ${raw}`)
  }
  if (/policy|permission|403|401|JWT|row-level security|Unauthorized/i.test(raw)) {
    return new Error(
      `Нет прав на загрузку (${raw || '403'}). Выполните supabase/fix_storage_upload.sql и войдите в аккаунт заново.`
    )
  }
  return new Error(raw || 'Ошибка загрузки фото')
}

export function validateImageFile(file) {
  if (!file) return null
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  if (!ALLOWED_EXT.includes(ext)) {
    throw new Error('Допустимы форматы: JPG, PNG, WebP, GIF')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Файл больше 5 МБ')
  }
  return ext
}

function contentType(file, ext) {
  if (file.type && file.type.startsWith('image/')) return file.type
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  }
  return map[ext] || 'image/jpeg'
}

async function getSessionOrThrow() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) return session

  const { data: { session: refreshed } } = await supabase.auth.refreshSession()
  if (refreshed?.access_token) return refreshed

  throw new Error('Войдите в аккаунт — для загрузки фото нужна авторизация')
}

async function tryUpload(client, bucket, path, file, options) {
  const { data, error } = await client.storage.from(bucket).upload(path, file, options)
  if (error) return { error }
  const { data: urlData } = client.storage.from(bucket).getPublicUrl(data.path)
  return { publicUrl: toCanonicalStorageUrl(urlData.publicUrl) }
}

/**
 * Загрузка в Storage: прокси (основной) → повторы → прямой URL Supabase (fallback).
 */
export async function uploadImage(file, bucket, { path, upsert = true, cacheControl = '31536000' } = {}) {
  const ext = validateImageFile(file)
  if (!path) {
    throw new Error('Не указан путь файла в Storage')
  }

  const session = await getSessionOrThrow()

  const options = {
    cacheControl,
    upsert,
    contentType: contentType(file, ext),
  }

  const clients = [{ client: supabase, label: 'proxy' }]
  if (usesProxy()) {
    const direct = getDirectClient()
    if (direct) {
      await direct.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      clients.push({ client: direct, label: 'direct' })
    }
  }

  let lastError = null

  for (const { client } of clients) {
    for (const delay of RETRY_MS) {
      if (delay > 0) await sleep(delay)
      try {
        const result = await tryUpload(client, bucket, path, file, options)
        if (result.publicUrl) return result.publicUrl
        lastError = result.error
        if (!isNetworkError(result.error)) break
      } catch (err) {
        lastError = err
        if (!isNetworkError(err)) break
      }
    }
  }

  throw formatStorageError(lastError, bucket)
}

export function slugifyFileName(name, fallback = 'file') {
  return (name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || fallback
}
