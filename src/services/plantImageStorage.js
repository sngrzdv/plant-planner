import { uploadImage, slugifyFileName } from './imageStorage'
import { supabase } from '../lib/supabase'

const BUCKET = 'plant-images'

export async function uploadPlantImage(file, { plantId, plantName } = {}) {
  if (!file) return null

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const prefix = plantId ? `${plantId}` : slugifyFileName(plantName, 'plant')
  const path = `${prefix}-${Date.now()}.${ext}`

  return uploadImage(file, BUCKET, { path, upsert: true })
}

export async function deletePlantImage(imageUrl) {
  if (!imageUrl || !imageUrl.includes(`/storage/v1/object/public/${BUCKET}/`)) return

  const path = imageUrl.split(`/storage/v1/object/public/${BUCKET}/`)[1]?.split('?')[0]
  if (!path) return

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.warn('deletePlantImage:', error.message)
}
