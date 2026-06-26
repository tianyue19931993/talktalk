import { query } from '../../server/lib/supabase-admin.js'
import { getSupabaseEnv } from '../../server/lib/supabase-env.js'

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

function decodeDataUrl(value) {
  const raw = safeText(value)
  if (!raw.startsWith('data:text/html')) return raw

  const commaIndex = raw.indexOf(',')
  if (commaIndex < 0) return ''

  const encoded = raw.slice(commaIndex + 1)
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

function guessFilename(title, questionId) {
  const base = safeText(title) || `演示_${safeText(questionId) || 'html'}`
  return `${base}.html`
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
      select: 'id,question_id,html_url,title',
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
      select: 'id,user_id',
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

    const htmlUrl = safeText(demo.html_url)
    let html = ''

    if (htmlUrl.startsWith('data:text/html')) {
      html = decodeDataUrl(htmlUrl)
    } else if (htmlUrl.startsWith('http')) {
      const response = await fetch(htmlUrl)
      if (!response.ok) {
        return res.status(500).json({ success: false, error: '读取演示内容失败' })
      }
      html = await response.text()
    }

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
