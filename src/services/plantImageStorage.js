import { uploadImage, slugifyFileName } from './imageStorage'
import { supabase } from '../lib/supabase'
import { storageObjectPath } from '../lib/plantImageUrl'

const BUCKET = 'plant-images'

export async function uploadPlantImage(file, { plantId, plantName } = {}) {
  if (!file) return null

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const prefix = plantId ? `${plantId}` : slugifyFileName(plantName, 'plant')
  const path = `${prefix}-${Date.now()}.${ext}`

  return uploadImage(file, BUCKET, { path, upsert: true })
}

export async function deletePlantImage(imageUrl) {
  const path = storageObjectPath(imageUrl, BUCKET)
  if (!path) return

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.warn('deletePlantImage:', error.message)
}
