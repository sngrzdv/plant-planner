const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const WEATHER_TTL_MS = 10 * 60 * 1000
const CACHE_PREFIX = 'weatherCache:'

function getCachedWeather(key) {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.data || !parsed?.timestamp) return null
    if (Date.now() - parsed.timestamp > WEATHER_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

function setCachedWeather(key, data) {
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({ timestamp: Date.now(), data })
    )
  } catch {
    // ignore cache write errors
  }
}

async function fetchWithTimeout(url, timeoutMs = 2500) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export const weatherApi = {
  // Получить погоду по координатам
  async getWeatherByCoords(lat, lon) {
    if (!API_KEY) return null
    const cacheKey = `coords:${lat.toFixed(2)}:${lon.toFixed(2)}`
    const cached = getCachedWeather(cacheKey)
    if (cached) return cached
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&lang=ru&appid=${API_KEY}&units=metric`
      const response = await fetchWithTimeout(url)
      if (!response.ok) throw new Error('Ошибка')
      const data = await response.json()
      const formatted = this.formatWeather(data)
      setCachedWeather(cacheKey, formatted)
      return formatted
    } catch (err) {
      console.debug('Ошибка погоды:', err)
      return null
    }
  },

  // Получить погоду по названию города
  async getWeatherByCity(city) {
    if (!API_KEY) return null
    const cityKey = (city || '').trim().toLowerCase()
    const cacheKey = `city:${cityKey}`
    const cached = getCachedWeather(cacheKey)
    if (cached) return cached
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&lang=ru&appid=${API_KEY}&units=metric`
      const response = await fetchWithTimeout(url)
      if (!response.ok) throw new Error('Город не найден')
      const data = await response.json()
      const formatted = this.formatWeather(data)
      setCachedWeather(cacheKey, formatted)
      return formatted
    } catch (err) {
      console.debug('Ошибка погоды:', err)
      return null
    }
  },

  // Умная загрузка: сначала геолокация, потом город по умолчанию
  async getWeather(preferredCity = null) {
    // Если пользователь указал город — используем его
    if (preferredCity) {
      return await this.getWeatherByCity(preferredCity)
    }

    // Пробуем геолокацию
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 1500,
          maximumAge: 10 * 60 * 1000,
          enableHighAccuracy: false,
        })
      })
      return await this.getWeatherByCoords(
        position.coords.latitude,
        position.coords.longitude
      )
    } catch {
      // Если геолокация не доступна — Москва по умолчанию
      console.log('Геолокация не доступна, использую Москву')
      return await this.getWeatherByCity('Москва')
    }
  },

  formatWeather(data) {
    return {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      city: data.name,
      country: data.sys.country
    }
  }
}