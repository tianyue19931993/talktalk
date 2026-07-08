import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key && (!process.env[key] || process.env[key].trim() === '')) {
      process.env[key] = value
    }
  }
}

loadEnvFile(path.join(__dirname, '.env.local'))
loadEnvFile(path.join(__dirname, '.env'))

process.env.SUPABASE_URL = process.env.SUPABASE_URL?.trim()
  ? process.env.SUPABASE_URL
  : (process.env.VITE_SUPABASE_URL || '').trim()
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim()

console.log('[server] SUPABASE_URL configured:', !!process.env.SUPABASE_URL)
console.log('[server] SUPABASE_SERVICE_ROLE_KEY configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

const dist = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 5173);

const mime = {
  '.html':'text/html','.js':'application/javascript','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml',
  '.ico':'image/x-icon','.json':'application/json',
};

const apiRoutes = {
  '/api/auth/reset-password': 'api/auth/reset-password.js',
  '/api/user-questions/submit': 'api/user-questions/submit.js',
  '/api/pay/cancel': 'api/pay/cancel.js',
  '/api/pay/create-order': 'api/pay/create-order.js',
  '/api/pay/notify': 'api/pay/notify.js',
  '/api/pay/query': 'api/pay/query.js',
  '/api/subscription/check': 'api/subscription/check.js',
  '/api/upload-html': 'api/upload-html.js',
  '/api/user-questions/download-demo': 'api/user-questions/download-demo.js',
  '/api/user-questions/generate-interaction': 'api/user-questions/generate-interaction.js',
}

const handlerCache = new Map()
const indexHtml = fs.readFileSync(path.join(dist, 'index.html'))

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function createResponse(res) {
  return {
    status(code) {
      res.statusCode = code
      return this
    },
    setHeader(name, value) {
      res.setHeader(name, value)
    },
    json(payload) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
      }
      res.end(JSON.stringify(payload))
    },
    end(payload) {
      res.end(payload)
    },
  }
}

async function loadHandler(routePath) {
  const rel = apiRoutes[routePath]
  if (!rel) return null
  const file = path.join(__dirname, rel)
  const stamp = fs.statSync(file).mtimeMs
  const cached = handlerCache.get(routePath)
  if (cached && cached.stamp === stamp) return cached.handler
  const mod = await import(`${pathToFileURL(file).href}?t=${stamp}`)
  const handler = mod.default || mod.handler || null
  handlerCache.set(routePath, { stamp, handler })
  return handler
}

async function handleApi(req, res, pathname, parsedUrl) {
  const handler = await loadHandler(pathname)
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  if (pathname === '/api/pay/notify') {
    // 回调需要保留原始请求流
    return handler(req, res)
  }

  const rawBody = await readBody(req)
  let body = null
  if (rawBody) {
    try {
      body = JSON.parse(rawBody)
    } catch {
      body = rawBody
    }
  }

  const mockReq = {
    method: req.method,
    headers: req.headers,
    url: req.url,
    query: Object.fromEntries(parsedUrl.searchParams.entries()),
    body,
  }

  return handler(mockReq, createResponse(res))
}

http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const pathname = parsedUrl.pathname

    if (apiRoutes[pathname]) {
      await handleApi(req, res, pathname, parsedUrl)
      return
    }

    if (pathname.startsWith('/demo-runtime/')) {
      res.setHeader('Access-Control-Allow-Origin', '*')
    }

    let url = pathname
    if (url === '/') url = '/index.html'
    const filePath = path.join(dist, url)

    try {
      if (fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath)
        res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' })
        return res.end(fs.readFileSync(filePath))
      }
    } catch (e) {}

    // SPA fallback
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(indexHtml)
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: error.message || 'Internal Server Error' }))
  }
}).listen(port, '0.0.0.0', () => {
  console.log('TalkTalk running at:')
  console.log(`  http://localhost:${port}/`)
  console.log(`  http://localhost:${port}/admin`)
  console.log('API routes enabled for local testing')
  console.log('按 Ctrl+C 停止')
})
