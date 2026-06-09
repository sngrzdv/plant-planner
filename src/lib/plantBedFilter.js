/** Правила посадки растений по типу зоны на участке. */

export const BED_TYPE_LABELS = {
  rect: 'Огород',
  flowerbed: 'Клумба',
  greenhouse: 'Теплица',
  tree: 'Дерево',
  bush: 'Куст',
}

export function getPlantCategoryKind(plant) {
  const name = (plant?.category?.name || '').toLowerCase().trim()
  if (!name) return 'other'
  if (/цвет/.test(name)) return 'flowers'
  if (/овощ/.test(name)) return 'vegetables'
  if (/зелен/.test(name)) return 'greens'
  if (/ягод/.test(name)) return 'berries'
  if (/трав/.test(name)) return 'herbs'
  if (/плодов|fruit/.test(name)) return 'fruit'
  return 'other'
}

/** Плодовые деревья — категория «Плодовые» или многолетник вне овощей/ягод/цветов. */
export function isFruitPlant(plant) {
  const kind = getPlantCategoryKind(plant)
  if (kind === 'fruit') return true
  if (kind === 'berries' || kind === 'flowers' || kind === 'herbs' || kind === 'greens' || kind === 'vegetables') {
    return false
  }
  return plant?.planting_method === 'perennial'
}

export function isPlantAllowedForBedType(plant, bedType) {
  if (!plant || !bedType) return true

  const kind = getPlantCategoryKind(plant)
  const fruit = isFruitPlant(plant)

  switch (bedType) {
    case 'flowerbed':
      return kind === 'flowers' || fruit
    case 'rect':
      return kind === 'vegetables' || kind === 'greens' || kind === 'berries'
    case 'greenhouse':
      return !fruit
    case 'tree':
      return fruit
    case 'bush':
      return fruit || kind === 'berries'
    default:
      return true
  }
}

export function withPlantCategory(plant, categories = []) {
  if (!plant) return plant
  if (plant.category?.name) return plant
  const category = categories.find((c) => c.id === plant.category_id)
  return category ? { ...plant, category } : plant
}

export function getFilterHintForBedType(bedType) {
  switch (bedType) {
    case 'flowerbed':
      return 'На клумбе можно сажать цветы и плодовые деревья.'
    case 'rect':
      return 'На огороде — овощи, зелень и ягоды.'
    case 'greenhouse':
      return 'В теплице можно сажать всё, кроме плодовых деревьев.'
    case 'tree':
      return 'На дереве — только плодовые культуры.'
    case 'bush':
      return 'На кусте — ягоды и плодовые культуры.'
    default:
      return ''
  }
}

export function getPlantBedRejectMessage(bedType, plant) {
  const zone = BED_TYPE_LABELS[bedType] || 'этой зоне'
  const name = plant?.name || 'Растение'
  return `${name} нельзя посадить на ${zone.toLowerCase()}. ${getFilterHintForBedType(bedType)}`
}

export function filterPlantsForBedType(plants, bedType, categories = []) {
  if (!bedType) return plants || []
  return (plants || [])
    .map((plant) => withPlantCategory(plant, categories))
    .filter((plant) => isPlantAllowedForBedType(plant, bedType))
}

export function filterPlantsForBedAndSearch(plants, bedType, search, categories = []) {
  const query = (search || '').trim().toLowerCase()
  const allowed = filterPlantsForBedType(plants, bedType, categories)
  if (!query) return allowed
  return allowed.filter(
    (plant) =>
      plant.name?.toLowerCase().includes(query) ||
      plant.category?.name?.toLowerCase().includes(query)
  )
}
