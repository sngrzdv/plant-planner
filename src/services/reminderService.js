import { supabase } from '../lib/supabase'
import { getMoonData } from '../utils/lunar'

class ReminderService {
  async generateForPlant(userId, plant, action, startDate = new Date()) {
    if (!userId || !plant) return []
    
    const reminders = []
    const start = new Date(startDate)
    
    switch (action) {
      case 'sowed':
        reminders.push(...this.wateringSchedule(plant, start))
        reminders.push(...this.fertilizingSchedule(plant, start))
        reminders.push(...this.germinationCheck(plant, start))
        reminders.push(...this.transplantReminder(plant, start))
        reminders.push(...this.harvestReminder(plant, start))
        break
        
      case 'transplanted':
        reminders.push(...this.wateringSchedule(plant, start))
        reminders.push(...this.fertilizingSchedule(plant, start))
        reminders.push(...this.harvestReminder(plant, start))
        break
        
      case 'planted':
        reminders.push(...this.wateringSchedule(plant, start))
        reminders.push(...this.fertilizingSchedule(plant, start))
        reminders.push(...this.harvestReminder(plant, start))
        break
    }
    
    const adjustedReminders = reminders.map(r => this.adjustByLunarCalendar(r))
    
    if (adjustedReminders.length > 0) {
      const tasksWithUser = adjustedReminders.map(r => ({
        type: r.type,
        title: r.title,
        description: r.description || null,
        plant_id: r.plant_id || null,
        due_date: r.due_date,
        priority: r.priority || 'normal',
        source: r.source || 'science',
        user_id: userId,
        status: 'pending'
      }))
      
      await supabase.from('reminders').insert(tasksWithUser)
    }
    
    return adjustedReminders
  }
  
  wateringSchedule(plant, startDate) {
    const tasks = []
    const freq = plant.watering_freq_days || 3
    const totalDays = plant.maturation_days || 90
    const count = Math.floor(totalDays / freq)
    
    for (let i = 1; i <= count; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i * freq)
      tasks.push({
        type: 'watering',
        title: `Полив: ${plant.name}`,
        description: `Регулярный полив (раз в ${freq} дн.)`,
        plant_id: plant.id,
        due_date: date.toISOString().split('T')[0],
        priority: 'normal',
        source: 'science'
      })
    }
    return tasks
  }
  
  fertilizingSchedule(plant, startDate) {
    const tasks = []
    const totalDays = plant.maturation_days || 90
    const count = Math.floor(totalDays / 14)
    
    for (let i = 1; i <= count; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i * 14)
      tasks.push({
        type: 'fertilizing',
        title: `Подкормка: ${plant.name}`,
        description: 'Внесение удобрений согласно графику',
        plant_id: plant.id,
        due_date: date.toISOString().split('T')[0],
        priority: 'normal',
        source: 'science'
      })
    }
    return tasks
  }
  
  germinationCheck(plant, startDate) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + 7)
    return [{
      type: 'transplant',
      title: `Проверить всходы: ${plant.name}`,
      description: 'Проверьте, появились ли первые ростки',
      plant_id: plant.id,
      due_date: date.toISOString().split('T')[0],
      priority: 'high',
      source: 'science'
    }]
  }
  
  transplantReminder(plant, startDate) {
    const daysToTransplant = Math.round((plant.maturation_days || 60) * 0.6)
    const date = new Date(startDate)
    date.setDate(date.getDate() + daysToTransplant)
    return [{
      type: 'transplant',
      title: `Пора пересаживать: ${plant.name}`,
      description: 'Рассада готова к пересадке в открытый грунт',
      plant_id: plant.id,
      due_date: date.toISOString().split('T')[0],
      priority: 'high',
      source: 'science'
    }]
  }
  
  harvestReminder(plant, startDate) {
    const totalDays = plant.maturation_days || 90
    const date = new Date(startDate)
    date.setDate(date.getDate() + totalDays)
    return [{
      type: 'harvest',
      title: `Сбор урожая: ${plant.name}`,
      description: `Ожидаемая дата сбора урожая (${totalDays} дней)`,
      plant_id: plant.id,
      due_date: date.toISOString().split('T')[0],
      priority: 'high',
      source: 'science'
    }]
  }
  
  adjustByLunarCalendar(reminder) {
    const date = new Date(reminder.due_date)
    const moon = getMoonData(date)
    
    if (reminder.type === 'watering' && moon.type === 'full_moon') {
      date.setDate(date.getDate() + 1)
      return { ...reminder, due_date: date.toISOString().split('T')[0] }
    }
    
    if (reminder.type === 'transplant' && (moon.type === 'new_moon' || moon.type === 'full_moon')) {
      date.setDate(date.getDate() + 2)
      return { ...reminder, due_date: date.toISOString().split('T')[0] }
    }
    
    return reminder
  }
  
  async getUserReminders(userId, filters = {}) {
    let query = supabase
      .from('reminders')
      .select('*, plants:plant_id(id, name, image_url, watering_freq_days)')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
    
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.plantId) query = query.eq('plant_id', filters.plantId)
    if (filters.dateFrom) query = query.gte('due_date', filters.dateFrom)
    if (filters.dateTo) query = query.lte('due_date', filters.dateTo)
    
    const { data } = await query
    return data || []
  }

  async adjustByWeather(reminders, weatherData) {
    if (!weatherData) return reminders
    
    const isRainExpected = 
      weatherData.description?.toLowerCase().includes('rain') ||
      weatherData.description?.toLowerCase().includes('дожд')
    
    if (!isRainExpected) return reminders
    
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    return reminders.map(r => {
      if (r.type === 'watering' && (r.due_date === today || r.due_date === tomorrowStr)) {
        return {
          ...r,
          description: (r.description || '') + ' 🌧️ Возможен дождь — проверьте погоду'
        }
      }
      return r
    })
  }
  
  async getTodayReminders(userId) {
    const today = new Date().toISOString().split('T')[0]
    return this.getUserReminders(userId, { dateFrom: today, dateTo: today, status: 'pending' })
  }
  
  async getOverdueReminders(userId) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return this.getUserReminders(userId, { 
      dateTo: yesterday.toISOString().split('T')[0], 
      status: 'pending' 
    })
  }
}

export const reminderService = new ReminderService()
export default reminderService