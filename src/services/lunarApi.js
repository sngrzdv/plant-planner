import { generateMonthCalendar, getMoonData, getMoonZodiac } from '../utils/lunar'
import { getRecommendation } from './gardeningRules'

class LunarApi {
  getMonthCalendar(year, month) {
    try {
      const y = parseInt(year, 10)
      const m = parseInt(month, 10)
      
      if (isNaN(y) || isNaN(m) || y < 1900 || y > 2100 || m < 0 || m > 11) {
        throw new Error(`Invalid date params: year=${year}, month=${month}`)
      }
      
      const calendar = generateMonthCalendar(y, m)
      
      if (calendar.length === 0) {
        throw new Error('Generated empty calendar')
      }
      
      return { success: true, data: calendar }
    } catch (error) {
      console.error('Error generating lunar calendar:', error)
      return { success: false, error: error.message }
    }
  }

  getDayData(date) {
    try {
      const d = date instanceof Date ? date : new Date(date)
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date object')
      }
      
      const moonData = getMoonData(d)
      const zodiac = getMoonZodiac(d)
      
      return { 
        success: true, 
        data: { date: d, ...moonData, zodiac } 
      }
    } catch (error) {
      console.error('Error getting lunar day:', error)
      return { success: false, error: error.message }
    }
  }
}

export const lunarApi = new LunarApi()
export default lunarApi