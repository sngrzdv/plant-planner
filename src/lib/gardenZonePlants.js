import { supabase } from './supabase'

const PLANT_FIELDS = 'id, name, watering_freq_days, maturation_days, image_url'

const GRID_ZONE_TYPES = new Set(['rect', 'flowerbed', 'greenhouse'])

function sourceLabelForOnBedRow(row) {
  if (row.source_type === 'pot') return 'Из рассады'
  return 'Посажено'
}

/**
 * Загружает посадки на зоне. На грядках одна физическая посадка = одна строка
 * (bed_elements + plants_on_beds не дублируются в списке).
 */
export async function fetchZonePlants(zone) {
  if (!zone?.id) return []

  const [onBedRes, elementsRes] = await Promise.all([
    supabase
      .from('plants_on_beds')
      .select('id, plant_id, source_type')
      .eq('bed_id', zone.id),
    supabase
      .from('bed_elements')
      .select('id, plant_id')
      .eq('bed_id', zone.id)
      .eq('type', 'plant_spot'),
  ])

  const onBedRows = onBedRes.data || []
  const elementRows = elementsRes.data || []
  const isGridZone = GRID_ZONE_TYPES.has(zone.type)

  const plantIds = new Set()
  for (const row of onBedRows) {
    if (row.plant_id) plantIds.add(row.plant_id)
  }
  for (const row of elementRows) {
    if (row.plant_id) plantIds.add(row.plant_id)
  }
  if ((zone.type === 'tree' || zone.type === 'bush') && zone.plant_id) {
    plantIds.add(zone.plant_id)
  }

  let plantById = new Map()
  if (plantIds.size > 0) {
    const { data: plantRows } = await supabase
      .from('plants')
      .select(PLANT_FIELDS)
      .in('id', [...plantIds])
    plantById = new Map((plantRows || []).map((p) => [p.id, p]))
  }

  if (zone.plant_id && zone.plant?.name && !plantById.has(zone.plant_id)) {
    plantById.set(zone.plant_id, zone.plant)
  }

  const entries = []

  if (isGridZone) {
    const onBedPool = onBedRows.filter((row) => row.plant_id)

    for (const row of elementRows) {
      if (!row.plant_id) continue
      const matchIdx = onBedPool.findIndex((b) => b.plant_id === row.plant_id)
      const matched = matchIdx >= 0 ? onBedPool.splice(matchIdx, 1)[0] : null
      entries.push({
        id: row.id,
        plantId: row.plant_id,
        recordType: 'bed_elements',
        plants: plantById.get(row.plant_id) || null,
        source: matched ? sourceLabelForOnBedRow(matched) : 'Из редактора грядки',
      })
    }

    for (const row of onBedPool) {
      entries.push({
        id: row.id,
        plantId: row.plant_id,
        recordType: 'plants_on_beds',
        plants: plantById.get(row.plant_id) || null,
        source: sourceLabelForOnBedRow(row),
      })
    }
  } else {
    for (const row of onBedRows) {
      if (!row.plant_id) continue
      entries.push({
        id: row.id,
        plantId: row.plant_id,
        recordType: 'plants_on_beds',
        plants: plantById.get(row.plant_id) || null,
        source: sourceLabelForOnBedRow(row),
      })
    }

    for (const row of elementRows) {
      if (!row.plant_id) continue
      entries.push({
        id: row.id,
        plantId: row.plant_id,
        recordType: 'bed_elements',
        plants: plantById.get(row.plant_id) || null,
        source: 'Из редактора грядки',
      })
    }
  }

  const isTreeOrBush = zone.type === 'tree' || zone.type === 'bush'
  if (isTreeOrBush && zone.plant_id && onBedRows.length === 0 && elementRows.length === 0) {
    entries.push({
      id: `zone-${zone.id}`,
      plantId: zone.plant_id,
      recordType: 'zone_plant',
      plants: plantById.get(zone.plant_id) || null,
      source: 'На зоне',
    })
  }

  return entries
}
