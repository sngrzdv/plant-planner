import dns from 'node:dns'

dns.setDefaultResultOrder('ipv4first')

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'host',
  'proxy-connection',
])

function filterHeaders(headers) {
  const out = {}
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue
    if (HOP_BY_HOP.has(key.toLowerCase())) continue
    out[key] = Array.isArray(value) ? value.join(', ') : String(value)
  }
  return out
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/**
 * Dev: Storage через localhost/supabase — Node проксирует на supabase.co.
 * Ответ отдаём целиком (arrayBuffer), без stream.pipe — стабильнее на Windows.
 */
export function supabaseStorageProxyPlugin(supabaseUrl) {
  const target = supabaseUrl?.replace(/\/$/, '')

  return {
    name: 'supabase-storage-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/supabase/storage')) {
          return next()
        }
        if (!target) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'VITE_SUPABASE_URL is not set' }))
          return
        }

        try {
          const body = await readBody(req)
          const pathAndQuery = url.replace(/^\/supabase/, '')
          const targetUrl = `${target}${pathAndQuery}`

          const response = await fetch(targetUrl, {
            method: req.method,
            headers: filterHeaders(req.headers),
            body: body.length > 0 ? body : undefined,
          })

          const out = Buffer.from(await response.arrayBuffer())
          res.statusCode = response.status

          response.headers.forEach((value, key) => {
            if (HOP_BY_HOP.has(key.toLowerCase())) return
            res.setHeader(key, value)
          })
          res.setHeader('Content-Length', String(out.length))
          res.end(out)
        } catch (err) {
          console.error('[supabase-storage-proxy]', err.cause?.code || err.message)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            message: err.cause?.code === 'ECONNRESET'
              ? 'Соединение с Supabase оборвано (ECONNRESET). Попробуйте VPN или загрузку на Vercel.'
              : err.message || 'Storage proxy error',
          }))
        }
      })
    },
  }
}
