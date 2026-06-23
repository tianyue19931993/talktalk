import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const apiRoutes: Record<string, string> = {
  '/api/auth/reset-password': 'api/auth/reset-password.js',
  '/api/generate/demo': 'api/generate/demo.js',
  '/api/generate/optimize': 'api/generate/optimize.js',
  '/api/pay/cancel': 'api/pay/cancel.js',
  '/api/pay/create-order': 'api/pay/create-order.js',
  '/api/pay/notify': 'api/pay/notify.js',
  '/api/pay/query': 'api/pay/query.js',
  '/api/subscription/check': 'api/subscription/check.js',
  '/api/upload-html': 'api/upload-html.js',
}

function createResponse(res: any) {
  return {
    status(code: number) {
      res.statusCode = code
      return this
    },
    setHeader(name: string, value: string) {
      res.setHeader(name, value)
    },
    json(payload: any) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
      }
      res.end(JSON.stringify(payload))
    },
    end(payload?: any) {
      res.end(payload)
    },
  }
}

async function readBody(req: any) {
  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function loadHandler(routePath: string) {
  const rel = apiRoutes[routePath]
  if (!rel) return null
  const file = path.join(process.cwd(), rel)
  if (!fs.existsSync(file)) return null
  const mod = await import(pathToFileURL(file).href)
  return mod.default || mod.handler || null
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.SUPABASE_URL ||= env.SUPABASE_URL || env.VITE_SUPABASE_URL || ''
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= env.SUPABASE_SERVICE_ROLE_KEY || ''

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-api-routes',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            try {
              const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
              const pathname = url.pathname
              if (!apiRoutes[pathname]) return next()

              const handler = await loadHandler(pathname)
              if (!handler) {
                res.statusCode = 404
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ error: 'Not found' }))
                return
              }

              if (pathname === '/api/pay/notify') {
                return handler(req, res)
              }

              const rawBody = await readBody(req)
              let body: any = null
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
                query: Object.fromEntries(url.searchParams.entries()),
                body,
              }

              return handler(mockReq, createResponse(res))
            } catch (error: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: error.message || 'Internal Server Error' }))
            }
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
  }
})
