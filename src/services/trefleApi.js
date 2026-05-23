const API_KEY = import.meta.env.VITE_TREFLE_API_KEY

async function translateToRussian(text) {
  if (!text) return text
  
  try {
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: 'ru',
        format: 'text'
      })
    })
    
    if (!response.ok) return text
    const data = await response.json()
    return data.translatedText || text
  } catch (err) {
    console.error('Ошибка перевода:', err)
    return text
  }
}

export const trefleApi = {
  async searchPlants(query, page = 1) {
    if (!API_KEY) return { data: [], total: 0 }
    
    try {
      // Переводим русский запрос на английский
      const englishQuery = await translateToEnglish(query)
      const searchQuery = englishQuery || query
      
      const url = `/api/trefle/plants/search?token=${API_KEY}&q=${encodeURIComponent(searchQuery)}&page=${page}&per_page=20`
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error('Ошибка ответа:', response.status)
        return { data: [], total: 0 }
      }
      
      const data = await response.json()
      
      // Переводим каждое растение на русский
      const translatedPlants = await Promise.all(
        (data.data || []).map(async (plant) => {
          const formatted = await this.formatPlant(plant)
          return formatted
        })
      )
      
      return {
        data: translatedPlants,
        total: data.meta?.total || 0
      }
    } catch (err) {
      console.error('Ошибка Trefle:', err)
      return { data: [], total: 0 }
    }
  },
  
  async formatPlant(plant) {
    const englishName = plant.common_name || plant.scientific_name
    // Переводим название на русский
    const russianName = await translateToRussian(englishName)
    
    return {
      trefle_id: plant.id,
      name: russianName || englishName,
      scientific_name: plant.scientific_name,
      image_url: plant.image_url,
      description: `${russianName || englishName} (${plant.scientific_name})`,
      scientific_facts: `Род: ${plant.genus || 'неизвестно'}`,
      category_id: 1,
      watering_freq_days: 3,
      maturation_days: 90
    }
  }
}

async function translateToEnglish(text) {
  if (!text) return text
  
  // Если уже на латинице — не переводим
  if (/^[a-zA-Z\s]+$/.test(text)) return text
  
  try {
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'ru',
        target: 'en',
        format: 'text'
      })
    })
    
    if (!response.ok) return text
    const data = await response.json()
    return data.translatedText || text
  } catch (err) {
    console.error('Ошибка перевода:', err)
    return text
  }
}