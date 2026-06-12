/** Приводит запись user_plants к формату, совместимому с каталогом plants. */
export function userPlantToCatalogShape(userPlant) {
  if (!userPlant) return null
  return {
    id: `user-${userPlant.id}`,
    _userPlantId: userPlant.id,
    _isUserPlant: true,
    name: userPlant.name,
    scientific_name: userPlant.scientific_name,
    category_id: userPlant.category_id,
    category: userPlant.category,
    description: userPlant.description,
    scientific_facts: userPlant.scientific_facts,
    watering_freq_days: userPlant.watering_freq_days,
    maturation_days: userPlant.maturation_days,
    planting_method: userPlant.planting_method,
    days_to_transplant: userPlant.days_to_transplant,
    days_to_harvest: userPlant.days_to_harvest,
    difficulty: userPlant.difficulty,
    image_url: userPlant.image_url,
    personal_notes: userPlant.personal_notes,
  }
}

export function isUserPlantEntry(plant) {
  return Boolean(plant?._isUserPlant && plant?._userPlantId)
}

export function mergePlantsWithUserPlants(catalogPlants, userPlants) {
  const userEntries = (userPlants || []).map(userPlantToCatalogShape).filter(Boolean)
  return [...(catalogPlants || []), ...userEntries]
}
