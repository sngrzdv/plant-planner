import { Link } from 'react-router-dom'
import { Mail, X } from 'lucide-react'
import { buildTaskDigestMailto } from '../lib/emailDigest'

export default function EmailDigestBanner({ profile, reminders, onDismiss }) {
  if (!profile?.email_notifications_enabled || !profile?.email) return null

  const today = new Date().toISOString().split('T')[0]
  const overdue = reminders.filter((r) => r.status === 'pending' && r.due_date < today)
  const todayTasks = reminders.filter((r) => r.status === 'pending' && r.due_date === today)

  if (!overdue.length && !todayTasks.length) return null

  const mailto = buildTaskDigestMailto(profile.email, { overdue, today: todayTasks })
  if (!mailto) return null

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-blue-900 text-sm">
          {overdue.length > 0
            ? `${overdue.length} просроченных и ${todayTasks.length} на сегодня`
            : `${todayTasks.length} ${todayTasks.length === 1 ? 'задача' : 'задач'} на сегодня`}
        </p>
        <p className="text-xs text-blue-700/80 mt-0.5">
          Email-напоминания включены — сформируйте письмо себе на {profile.email}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={mailto}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          <Mail className="w-4 h-4" /> Открыть в почте
        </a>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-2 text-blue-400 hover:text-blue-600 rounded-lg"
            aria-label="Скрыть"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
