import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('DIGEST_FROM_EMAIL') || 'Мой огород <onboarding@resend.dev>'

function buildDigestText({ overdue = [], today = [] }) {
  const lines = ['Мой огород — напоминание о задачах', '']
  if (overdue.length) {
    lines.push(`Просрочено (${overdue.length}):`)
    overdue.slice(0, 15).forEach((t) => lines.push(`  • ${t.title}${t.due_date ? ` (${t.due_date})` : ''}`))
    lines.push('')
  }
  if (today.length) {
    lines.push(`На сегодня (${today.length}):`)
    today.slice(0, 15).forEach((t) => lines.push(`  • ${t.title}`))
    lines.push('')
  }
  lines.push('', 'Открыть приложение: https://plant-planner-nu.vercel.app/reminders')
  return lines.join('\n')
}

function buildSubject({ overdue = [], today = [] }) {
  if (overdue.length) return `Мой огород: ${overdue.length} просроченных задач`
  if (today.length) return `Мой огород: ${today.length} задач на сегодня`
  return 'Мой огород: задачи'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ sent: false, reason: 'RESEND_API_KEY not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, email_notifications_enabled')
      .eq('id', user.id)
      .single()

    if (!profile?.email_notifications_enabled || !profile?.email) {
      return new Response(JSON.stringify({ sent: false, reason: 'Email notifications disabled' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const overdue = body.overdue || []
    const today = body.today || []

    if (!overdue.length && !today.length) {
      return new Response(JSON.stringify({ sent: false, reason: 'No tasks' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [profile.email],
        subject: buildSubject({ overdue, today }),
        text: buildDigestText({ overdue, today }),
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Resend error:', errText)
      return new Response(JSON.stringify({ sent: false, reason: 'Resend failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
