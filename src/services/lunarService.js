import lunarApi from './lunarApi'
import { getRecommendation } from './gardeningRules'

class LunarService {
  getCalendarWithRecommendations(year, month, crop = null) {
    const result = lunarApi.getMonthCalendar(year, month)
    
    if (!result.success) return result
    
    const calendarWithRecs = result.data.map(day => {
      const rec = getRecommendation(day.type, crop)
      return { ...day, recommendation: rec }
    })
    
    return { success: true, data: calendarWithRecs }
  }

  isFavorableForPlanting(date, crop) {
    const result = lunarApi.getDayData(date)
    if (!result.success) return false
    
    const rec = getRecommendation(result.data.type, crop)
    return rec.status === 'favorable'
  }

  getCurrentPhaseSummary() {
    const today = new Date()
    const result = lunarApi.getDayData(today)
    
    if (!result.success) return null
    
    const rec = getRecommendation(result.data.type)
    
    return {
      ...result.data,
      generalRecommendation: rec
    }
  }
}

export const lunarService = new LunarService()
export default lunarService