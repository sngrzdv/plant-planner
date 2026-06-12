import { supabase } from '../lib/supabase'

const CELL_SIZE = 50
const CELL_OCCUPY_TOLERANCE = 20

function snapCoord(value) {
  return Math.round(Number(value) || 0)
}

/** Занята ли клетка на грядке (по данным bed_elements). */
export async function isGridCellOccupied(bedId, cellX, cellY) {
  const targetX = snapCoord(cellX)
  const targetY = snapCoord(cellY)
  const { data, error } = await supabase
    .from('bed_elements')
    .select('id, pos_x, pos_y')
    .eq('bed_id', bedId)
    .eq('type', 'plant_spot')

  if (error) throw error
  return (data || []).some(
    (spot) =>
      Math.abs(spot.pos_x - (targetX + 4)) < CELL_OCCUPY_TOLERANCE &&
      Math.abs(spot.pos_y - (targetY + 4)) < CELL_OCCUPY_TOLERANCE,
  )
}

/** ID грядок пользователя (через layouts). */
export async function fetchUserBedIds(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('beds')
    .select('id, layouts!inner(user_id)')
    .eq('layouts.user_id', userId)

  if (error) throw error
  return (data || []).map((b) => b.id)
}

/**
 * Посадка в клетку редактора: bed_elements + plants_on_beds (как при пересадке из рассады).
 */
export async function plantInBedGrid(bedId, plant, { cellX, cellY, plantedYear } = {}) {
  const year = plantedYear ?? new Date().getFullYear()
  const today = new Date().toISOString().split('T')[0]
  const x = snapCoord(cellX) + 4
  const y = snapCoord(cellY) + 4

  if (await isGridCellOccupied(bedId, cellX, cellY)) {
    throw new Error('Эта клетка уже занята')
  }

  const { data: element, error: elementError } = await supabase
    .from('bed_elements')
    .insert({
      bed_id: bedId,
      type: 'plant_spot',
      name: plant.name,
      pos_x: x,
      pos_y: y,
      width: CELL_SIZE - 8,
      height: CELL_SIZE - 8,
      color: '#4ADE80',
      plant_id: plant.id,
      planted_year: year,
    })
    .select('*, plant:plant_id(id, name, image_url, watering_freq_days, maturation_days, planting_method, difficulty, scientific_facts)')
    .single()

  if (elementError) throw elementError

  const { error: onBedError } = await supabase.from('plants_on_beds').insert({
    bed_id: bedId,
    plant_id: plant.id,
    planted_date: today,
    source_type: 'seedling_direct',
    stage: 'seedling',
  })

  if (onBedError) {
    await supabase.from('bed_elements').delete().eq('id', element.id)
    throw onBedError
  }

  return element
}

/** Удалить посадку из редактора грядки (обе таблицы). */
export async function removeGridPlanting(bedElementId, bedId, plantId) {
  const { error: elementError } = await supabase.from('bed_elements').delete().eq('id', bedElementId)
  if (elementError) throw elementError

  const { data: onBedRows } = await supabase
    .from('plants_on_beds')
    .select('id')
    .eq('bed_id', bedId)
    .eq('plant_id', plantId)
    .in('source_type', ['seedling_direct', 'pot'])
    .limit(1)

  if (onBedRows?.[0]) {
    await supabase.from('plants_on_beds').delete().eq('id', onBedRows[0].id)
  }
}

/** Статистика посадок пользователя (без дублей bed_elements + plants_on_beds). */
export async function fetchUserPlantingStats(userId) {
  const bedIds = await fetchUserBedIds(userId)
  if (!bedIds.length) {
    return { plantings: [], count: 0 }
  }

  const [{ data: elements }, { data: onBeds }] = await Promise.all([
    supabase
      .from('bed_elements')
      .select('bed_id, plant_id, planted_year, plants:plant_id(name, image_url)')
      .in('bed_id', bedIds)
      .eq('type', 'plant_spot'),
    supabase
      .from('plants_on_beds')
      .select('bed_id, plant_id, planted_date, plants:plant_id(name, image_url)')
      .in('bed_id', bedIds),
  ])

  const seen = new Set()
  const plantings = []

  for (const row of elements || []) {
    const key = `${row.bed_id}-${row.plant_id}`
    if (seen.has(key)) continue
    seen.add(key)
    plantings.push({
      bed_id: row.bed_id,
      plant_id: row.plant_id,
      planted_year: row.planted_year,
      plants: row.plants,
    })
  }

  for (const row of onBeds || []) {
    const key = `${row.bed_id}-${row.plant_id}`
    if (seen.has(key)) continue
    seen.add(key)
    plantings.push({
      bed_id: row.bed_id,
      plant_id: row.plant_id,
      planted_year: row.planted_date ? new Date(row.planted_date).getFullYear() : new Date().getFullYear(),
      plants: row.plants,
    })
  }

  return { plantings, count: plantings.length }
}
