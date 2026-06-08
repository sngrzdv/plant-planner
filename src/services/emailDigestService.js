import { supabase } from '../lib/supabase'
import { buildTaskDigestMailto, buildDigestLines } from '../lib/emailDigest'

const DIGEST_SENT_KEY = 'pp_email_digest_sent'

function digestSentKey(userId) {
  const today = new Date().toISOString().split('T')[0]
  return `${DIGEST_SENT_KEY}:${userId}:${today}`
}

function wasDigestSentToday(userId) {
  try {
    return localStorage.getItem(digestSentKey(userId)) === '1'
  } catch {
    return false
  }
}

function markDigestSentToday(userId) {
  try {
    localStorage.setItem(digestSentKey(userId), '1')
  } catch {
    // ignore
  }
}

function splitReminders(reminders) {
  const today = new Date().toISOString().split('T')[0]
  const overdue = reminders.filter((r) => r.status === 'pending' && r.due_date < today)
  const todayTasks = reminders.filter((r) => r.status === 'pending' && r.due_date === today)
  return { overdue, today: todayTasks }
}

/**
 * Пробует отправить email-дайджест через Supabase Edge Function (Resend).
 * Без настроенной функции — тихо пропускает; на главной остаётся mailto-баннер.
 */
export async function trySendEmailDigest(profile, reminders) {
  if (!profile?.email_notifications_enabled || !profile?.email || !profile?.id) return false

  const { overdue, today } = splitReminders(reminders)
  if (!overdue.length && !today.length) return false

  if (profile.last_email_digest_sent_at) {
    const sentDate = profile.last_email_digest_sent_at.split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]
    if (sentDate === todayStr) return false
  }

  if (wasDigestSentToday(profile.id)) return false

  try {
    const { data, error } = await supabase.functions.invoke('send-email-digest', {
      body: {
        overdue: overdue.map((r) => ({ title: r.title, due_date: r.due_date })),
        today: today.map((r) => ({ title: r.title, due_date: r.due_date })),
      },
    })

    if (error) {
      console.debug('Email digest edge function unavailable:', error.message)
      return false
    }

    if (data?.sent) {
      markDigestSentToday(profile.id)
      await supabase
        .from('profiles')
        .update({ last_email_digest_sent_at: new Date().toISOString() })
        .eq('id', profile.id)
      return true
    }
  } catch (err) {
    console.debug('Email digest skipped:', err?.message || err)
  }

  return false
}

export { buildTaskDigestMailto, buildDigestLines, splitReminders }
