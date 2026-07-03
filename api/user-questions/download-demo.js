import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { query } from '../../server/lib/supabase-admin.js'
import { getSupabaseEnv } from '../../server/lib/supabase-env.js'
import { buildComponentDemoHtml, getRequestOrigin } from '../../server/lib/component-demo-html.js'

function safeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

async function getCurrentUser(authHeader) {
  const { url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY } = getSupabaseEnv()
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase 未配置')
  }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': authHeader,
    },
  })

  if (!userRes.ok) {
    throw new Error('Token 无效或已过期')
  }

  return await userRes.json()
}

function guessFilename(title, questionId) {
  const base = safeText(title) || `演示_${safeText(questionId) || 'html'}`
  return `${base}.html`
}

async function loadRuntimeAssets(origin) {
  if (/localhost|127\.0\.0\.1/.test(origin)) {
    try {
      const runtimeDirectory = path.resolve(process.cwd(), 'dist/demo-runtime')
      const [script, css] = await Promise.all([
        readFile(path.join(runtimeDirectory, 'demo-standalone.js'), 'utf8'),
        readFile(path.join(runtimeDirectory, 'demo-standalone.css'), 'utf8'),
      ])
      return { script, css }
    } catch {
      return {}
    }
  }

  try {
    const [scriptResponse, cssResponse] = await Promise.all([
      fetch(`${origin}/demo-runtime/demo-standalone.js`),
      fetch(`${origin}/demo-runtime/demo-standalone.css`),
    ])
    const scriptType = safeText(scriptResponse.headers.get('content-type') || '').toLowerCase()
    const cssType = safeText(cssResponse.headers.get('content-type') || '').toLowerCase()
    if (
      !scriptResponse.ok
      || !cssResponse.ok
      || !scriptType.includes('javascript')
      || !cssType.includes('text/css')
    ) return {}
    return {
      script: await scriptResponse.text(),
      css: await cssResponse.text(),
    }
  } catch {
    return {}
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const demoId = safeText(url.searchParams.get('demoId'))
    if (!demoId) {
      return res.status(400).json({ success: false, error: '缺少 demoId' })
    }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '未登录' })
    }

    const userData = await getCurrentUser(authHeader)
    const userId = userData.id

    const { data: demoRows, error: demoError } = await query('question_demos', {
      filters: { id: demoId },
      select: 'id,question_id,title',
      limit: 1,
    })
    if (demoError) {
      return res.status(500).json({ success: false, error: `读取演示失败: ${demoError}` })
    }

    const demo = demoRows?.[0]
    if (!demo) {
      return res.status(404).json({ success: false, error: '演示不存在' })
    }

    const { data: questionRows, error: questionError } = await query('user_questions', {
      filters: { id: demo.question_id },
      select: 'id,user_id,question_text,math_analysis_json,logic_analysis_json,tutor_analysis_json,component_analysis_json',
      limit: 1,
    })
    if (questionError) {
      return res.status(500).json({ success: false, error: `读取题目失败: ${questionError}` })
    }

    const question = questionRows?.[0]
    if (!question) {
      return res.status(404).json({ success: false, error: '题目不存在' })
    }

    if (safeText(question.user_id) !== userId) {
      return res.status(403).json({ success: false, error: '无权操作该题目' })
    }

    const origin = getRequestOrigin(req)
    const runtimeAssets = await loadRuntimeAssets(origin)
    const html = buildComponentDemoHtml(question, origin, runtimeAssets)

    if (!html) {
      return res.status(500).json({ success: false, error: '演示内容为空' })
    }

    const filename = guessFilename(demo.title, demo.id)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    return res.status(200).end(html)
  } catch (error) {
    console.error('[user-questions/download-demo] error:', error)
    return res.status(500).json({ success: false, error: error?.message || '下载失败' })
  }
}
