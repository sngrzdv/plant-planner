import { supabase } from '../lib/supabase'

class NotificationService {
  constructor() {
    this.permission = 'default'
    this.swRegistration = null
  }

  // Запросить разрешение
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Браузер не поддерживает уведомления')
      return false
    }

    const result = await Notification.requestPermission()
    this.permission = result
    return result === 'granted'
  }

  // Проверить разрешение
  isGranted() {
    return 'Notification' in window && Notification.permission === 'granted'
  }

  // Отправить локальное уведомление
  send(title, options = {}) {
    if (!this.isGranted()) return

    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'plant-planner',
      requireInteraction: false,
      ...options
    }

    try {
      new Notification(title, defaultOptions)
    } catch (e) {
      console.error('Ошибка отправки уведомления:', e)
    }
  }

  // Проверить сегодняшние задачи и отправить уведомления
  async checkAndNotify(reminders) {
    if (!this.isGranted()) return

    const today = new Date().toISOString().split('T')[0]
    const todayTasks = reminders.filter(r => r.due_date === today && r.status === 'pending')
    const overdueTasks = reminders.filter(r => r.due_date < today && r.status === 'pending')

    // Просроченные задачи
    if (overdueTasks.length > 0) {
      this.send('⚠️ Просроченные задачи', {
        body: `У вас ${overdueTasks.length} просроченных задач. Проверьте календарь ухода.`,
        requireInteraction: true,
        tag: 'overdue'
      })
    }

    // Задачи на сегодня
    if (todayTasks.length > 0) {
      const wateringCount = todayTasks.filter(t => t.type === 'watering').length
      const harvestCount = todayTasks.filter(t => t.type === 'harvest').length
      
      let body = `Сегодня нужно выполнить ${todayTasks.length} задач`
      if (wateringCount > 0) body += `\n💧 Полив: ${wateringCount}`
      if (harvestCount > 0) body += `\n🧺 Сбор урожая: ${harvestCount}`

      this.send('📅 Задачи на сегодня', { body, tag: 'today' })
    }
  }

  // Уведомление о погоде
  sendWeatherAlert(weatherData, reminders) {
    if (!this.isGranted()) return

    if (weatherData?.description?.includes('дожд') || weatherData?.description?.includes('rain')) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      const tomorrowWatering = reminders.filter(
        r => r.due_date === tomorrowStr && r.type === 'watering' && r.status === 'pending'
      )

      if (tomorrowWatering.length > 0) {
        this.send('🌧️ Завтра дождь!', {
          body: 'Можно пропустить полив — природа всё сделает сама.',
          tag: 'weather'
        })
      }
    }

    if (weatherData?.temp !== undefined && weatherData.temp < 3) {
      this.send('🥶 Заморозки!', {
        body: `Температура ${weatherData.temp}°C. Укройте рассаду и теплолюбивые растения.`,
        requireInteraction: true,
        tag: 'frost'
      })
    }
  }

  // Уведомление о готовности рассады
  sendSeedlingReady(plantName) {
    if (!this.isGranted()) return
    this.send('🌱 Рассада готова!', {
      body: `${plantName} можно пересаживать в открытый грунт.`,
      tag: 'seedling'
    })
  }

  // Уведомление по лунному календарю
  sendLunarAdvice(text) {
    if (!this.isGranted()) return
    this.send('🌙 Совет дня', {
      body: text,
      tag: 'lunar'
    })
  }
}

export const notificationService = new NotificationService()
export default notificationService