const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY

export const weatherApi = {
  // Получить погоду по координатам
  async getWeatherByCoords(lat, lon) {
    if (!API_KEY) return null
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&lang=ru&appid=${API_KEY}&units=metric`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Ошибка')
      const data = await response.json()
      return this.formatWeather(data)
    } catch (err) {
      console.error('Ошибка погоды:', err)
      return null
    }
  },

  // Получить погоду по названию города
  async getWeatherByCity(city) {
    if (!API_KEY) return null
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&lang=ru&appid=${API_KEY}&units=metric`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Город не найден')
      const data = await response.json()
      return this.formatWeather(data)
    } catch (err) {
      console.error('Ошибка погоды:', err)
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
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      })
      return await this.getWeatherByCoords(
        position.coords.latitude,
        position.coords.longitude
      )
    } catch (geoError) {
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