import { uploadImage, slugifyFileName } from './imageStorage'

const BUCKET = 'avatars'

export async function uploadAvatar(file, userId) {
  if (!userId) throw new Error('Войдите в аккаунт')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/avatar.${ext}`
  return uploadImage(file, BUCKET, { path, upsert: true })
}

export function avatarFallbackName(name) {
  return slugifyFileName(name, 'user')
}
