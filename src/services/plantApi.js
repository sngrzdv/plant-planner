import axios from 'axios'

const OPENFARM_API = 'https://openfarm.cc/api/v1'

// Сервис для поиска растений в OpenFarm
export const plantApi = {
  // Поиск растений по названию
  async searchPlants(query) {
    try {
      const response = await axios.get(`${OPENFARM_API}/crops`, {
        params: {
          filter: query,
          include: 'pictures'
        }
      })
      
      return response.data.data.map(crop => this.formatCropData(crop))
    } catch (error) {
      console.error('Ошибка поиска в OpenFarm:', error)
      return []
    }
  },
  
  // Получить детальную информацию о растении
  async getPlantDetails(cropSlug) {
    try {
      const response = await axios.get(`${OPENFARM_API}/crops/${cropSlug}`)
      return this.formatCropData(response.data.data)
    } catch (error) {
      console.error('Ошибка получения деталей:', error)
      return null
    }
  },
  
  // Форматирование данных из OpenFarm в наш формат
  formatCropData(crop) {
    const attrs = crop.attributes || {}
    
    // Парсим частоту полива из описания (примерная логика)
    let wateringFreq = 3
    const desc = (attrs.description || '').toLowerCase()
    if (desc.includes('drought') || desc.includes('dry')) wateringFreq = 5
    if (desc.includes('moist') || desc.includes('water')) wateringFreq = 2
    if (desc.includes('daily')) wateringFreq = 1
    
    // Парсим срок созревания
    let maturationDays = 90
    const maturityMatch = desc.match(/(\d+)[-\s]?(day|week|month)/i)
    if (maturityMatch) {
      const num = parseInt(maturityMatch[1])
      const unit = maturityMatch[2].toLowerCase()
      if (unit.includes('week')) maturationDays = num * 7
      else if (unit.includes('month')) maturationDays = num * 30
      else maturationDays = num
    }
    
    // Определяем категорию по названию/описанию
    const name = attrs.name?.toLowerCase() || ''
    let categoryId = 1 // Овощи по умолчанию
    if (name.includes('flower') || name.includes('rose') || name.includes('lily')) categoryId = 4
    else if (name.includes('berry') || name.includes('strawberry')) categoryId = 3
    else if (name.includes('herb') || name.includes('basil') || name.includes('mint')) categoryId = 2
    else if (name.includes('tree') || name.includes('fruit')) categoryId = 5
    
    return {
      name: attrs.name || 'Неизвестное растение',
      scientific_name: attrs.scientific_name || null,
      description: attrs.description || '',
      scientific_facts: this.extractScientificFacts(attrs),
      watering_freq_days: wateringFreq,
      maturation_days: maturationDays,
      fertilizer_info: this.extractFertilizerInfo(attrs),
      category_id: categoryId,
      image_url: attrs.main_image_path || this.getImageUrl(crop),
      sun_requirements: attrs.sun_requirements || 'Не указано',
      sowing_method: attrs.sowing_method || 'Не указано',
      growing_degree_days: attrs.growing_degree_days || null,
      external_id: crop.id,
      external_source: 'openfarm'
    }
  },
  
  extractScientificFacts(attrs) {
    const facts = []
    if (attrs.sun_requirements) facts.push(`☀️ Освещение: ${attrs.sun_requirements}`)
    if (attrs.sowing_method) facts.push(`🌱 Посев: ${attrs.sowing_method}`)
    if (attrs.growing_degree_days) facts.push(`🌡️ GDD: ${attrs.growing_degree_days}`)
    return facts.join('. ') || 'Информация из OpenFarm'
  },
  
  extractFertilizerInfo(attrs) {
    const desc = (attrs.description || '').toLowerCase()
    if (desc.includes('nitrogen')) return 'Требует азотных подкормок'
    if (desc.includes('compost')) return 'Хорошо отзывается на компост'
    return 'Рекомендуется стандартное удобрение'
  },
  
  getImageUrl(crop) {
    if (crop.attributes?.main_image_path) {
      return crop.attributes.main_image_path
    }
    if (crop.relationships?.pictures?.data?.length) {
      // Можно получить URL изображения, но это требует доп. запроса
      return null
    }
    return null
  }
}