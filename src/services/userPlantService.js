import { supabase } from '../lib/supabase'

export const PLANT_FORM_DEFAULTS = {
  name: '',
  scientific_name: '',
  category_id: '',
  description: '',
  scientific_facts: '',
  personal_notes: '',
  watering_freq_days: 3,
  maturation_days: 60,
  planting_method: 'direct',
  days_to_transplant: 0,
  days_to_harvest: 60,
  difficulty: 'Легко',
}

function buildPlantPayload(form, imageUrl) {
  return {
    name: form.name.trim(),
    scientific_name: form.scientific_name?.trim() || null,
    category_id: form.category_id ? Number(form.category_id) : null,
    description: form.description?.trim() || null,
    scientific_facts: form.scientific_facts?.trim() || null,
    watering_freq_days: Number(form.watering_freq_days) || 3,
    maturation_days: Number(form.maturation_days) || 60,
    planting_method: form.planting_method || 'direct',
    days_to_transplant: Number(form.days_to_transplant) || 0,
    days_to_harvest: Number(form.days_to_harvest) || 60,
    difficulty: form.difficulty || 'Легко',
    image_url: imageUrl || null,
  }
}

export function validatePlantForm(form) {
  if (!form.name?.trim()) return 'Укажите название растения'
  if (!form.category_id) return 'Выберите категорию'
  return null
}

/** Сохранить в личный дневник (user_plants + запись в garden_journal). */
export async function saveToPersonalDiary(userId, form, imageUrl) {
  const payload = buildPlantPayload(form, imageUrl)

  const { data, error } = await supabase
    .from('user_plants')
    .insert({
      user_id: userId,
      ...payload,
      personal_notes: form.personal_notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error

  const { error: journalError } = await supabase.from('garden_journal').insert({
    user_id: userId,
    user_plant_id: data.id,
    action: 'custom_plant_added',
    details: `В дневник: ${data.name}`,
    created_at: new Date().toISOString(),
  })
  if (journalError) console.warn('journal:', journalError.message)

  return data
}

/** Заявка на добавление в общий каталог. */
export async function submitToCatalog(userId, form, imageUrl) {
  const payload = buildPlantPayload(form, imageUrl)

  const { data, error } = await supabase
    .from('plant_submissions')
    .insert({
      user_id: userId,
      status: 'pending',
      ...payload,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function fetchUserPlants(userId) {
  const { data, error } = await supabase
    .from('user_plants')
    .select('*, category:category_id(id, name, icon)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchUserSubmissions(userId) {
  const { data, error } = await supabase
    .from('plant_submissions')
    .select('*, category:category_id(id, name, icon)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function deleteUserPlant(id) {
  const { error } = await supabase.from('user_plants').delete().eq('id', id)
  if (error) throw error
}

/** Админ: одобрить заявку → запись в plants. */
export async function approveSubmission(submission) {
  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .insert({
      name: submission.name,
      scientific_name: submission.scientific_name,
      category_id: submission.category_id,
      description: submission.description,
      scientific_facts: submission.scientific_facts,
      watering_freq_days: submission.watering_freq_days,
      maturation_days: submission.maturation_days,
      planting_method: submission.planting_method,
      days_to_transplant: submission.days_to_transplant,
      days_to_harvest: submission.days_to_harvest,
      difficulty: submission.difficulty,
      image_url: submission.image_url,
    })
    .select()
    .single()

  if (plantError) throw plantError

  const { error: updateError } = await supabase
    .from('plant_submissions')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submission.id)

  if (updateError) throw updateError
  return plant
}

export async function rejectSubmission(id, adminComment) {
  const { error } = await supabase
    .from('plant_submissions')
    .update({
      status: 'rejected',
      admin_comment: adminComment || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

export async function fetchPendingSubmissions() {
  const { data, error } = await supabase
    .from('plant_submissions')
    .select('*, category:category_id(id, name, icon)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}
