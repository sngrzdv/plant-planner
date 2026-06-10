import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useProfilePrefs } from '../hooks/useProfilePrefs'
import { weatherApi } from '../services/weatherApi'
import { notificationService } from '../services/notificationService'
import { trySendEmailDigest } from '../services/emailDigestService'
import { fetchPendingReminders } from '../services/pendingRemindersService'
import { getMoonData } from '../utils/lunar'

function getLunarAdviceForToday() {
  try {
    const moonData = getMoonData(new Date())
    if (moonData.type === 'new_moon' || moonData.type === 'full_moon') {
      return { text: `${moonData.phase} — отдохните.`, emoji: moonData.emoji }
    }
    if (moonData.type.includes('waxing')) {
      return { text: `${moonData.phase}. Хорошее время для посадки.`, emoji: moonData.emoji }
    }
    return { text: `${moonData.phase}.`, emoji: moonData.emoji }
  } catch {
    return { text: '', emoji: '🌙' }
  }
}

/** Push- и email-уведомления на любой странице (не только главной). */
export default function NotificationRunner() {
  const { user, profile } = useAuthStore()
  const prefs = useProfilePrefs()
  const userId = user?.id

  useEffect(() => {
    if (!userId || !profile) return undefined

    let cancelled = false

    async function tick() {
      const lunarAdvice = getLunarAdviceForToday()
      const [weatherData, reminders] = await Promise.all([
        weatherApi.getWeather(profile.city || null).catch(() => null),
        fetchPendingReminders(userId).catch(() => []),
      ])

      if (cancelled) return

      notificationService.runDashboardNotifications({
        profile,
        prefs,
        reminders,
        weather: weatherData,
        lunarAdvice,
      })

      await trySendEmailDigest(profile, reminders)
    }

    const initialDelay = setTimeout(tick, 3000)
    const interval = setInterval(tick, 10 * 60 * 1000)
    return () => {
      cancelled = true
      clearTimeout(initialDelay)
      clearInterval(interval)
    }
  }, [
    userId,
    profile?.id,
    profile?.city,
    profile?.notification_enabled,
    profile?.email_notifications_enabled,
    profile?.last_email_digest_sent_at,
    prefs.lunarEnabled,
    prefs.weatherAlerts,
  ])

  return null
}
