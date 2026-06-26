import crypto from 'crypto'
import { query, insert, updateWhere } from '../../server/lib/supabase-admin.js'
import { getSupabaseEnv } from '../../server/lib/supabase-env.js'

function safeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeHtml(value) {
  return safeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

function getObservationData(question) {
  const mathAnalysis = question.math_analysis_json || {}
  const goal = mathAnalysis.goal && typeof mathAnalysis.goal === 'object' ? mathAnalysis.goal : {}
  return {
    questionText: safeText(question.question_text || ''),
    goalText: safeText(goal.text || question.question_text || ''),
    goalTarget: safeText(goal.target || '求解目标'),
    knownConditions: normalizeArray(mathAnalysis.known_conditions).map((item) => ({
      text: safeText(item?.text || ''),
      unit: safeText(item?.unit || ''),
      value: item?.value,
    })).filter((item) => item.text),
    hiddenConditions: normalizeArray(mathAnalysis.hidden_conditions).map((item) => ({
      text: safeText(item?.text || ''),
    })).filter((item) => item.text),
  }
}

function getChallengeData(question) {
  const tutorAnalysis = question.tutor_analysis_json || {}
  return {
    steps: normalizeArray(tutorAnalysis.challenge_steps).map((item, index) => ({
      step: item?.step ?? index + 1,
      hint: safeText(item?.hint || ''),
      question: safeText(item?.question || ''),
    })).filter((item) => item.hint || item.question),
  }
}

function urlsafe(value) {
  const buffer = typeof value === 'string' ? Buffer.from(value) : value
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
}

async function uploadHtmlContent(content, refId) {
  const ak = process.env.QINIU_ACCESS_KEY
  const sk = process.env.QINIU_SECRET_KEY
  const domain = process.env.QINIU_DOMAIN
  const bucket = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab'
  const host = process.env.QINIU_UPLOAD_HOST || 'https://up.qiniup.com'

  if (!ak || !sk || !domain) {
    return `data:text/html;charset=utf-8,${encodeURIComponent(content)}`
  }

  const key = `MHTML/user/${refId || 'unknown'}/${Date.now()}.html`
  const putPolicy = JSON.stringify({ scope: `${bucket}:${key}`, deadline: Math.floor(Date.now() / 1000) + 3600 })
  const encodedPolicy = urlsafe(putPolicy)
  const sign = crypto.createHmac('sha1', sk).update(encodedPolicy).digest()
  const token = `${ak}:${urlsafe(sign)}:${encodedPolicy}`
  const boundary = `----QiniuFormBoundary${Date.now()}`
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="token"\r\n\r\n${token}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="key"\r\n\r\n${key}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${Date.now()}.html"\r\nContent-Type: text/html; charset=utf-8\r\n\r\n`),
    Buffer.from(content, 'utf-8'),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])

  const res = await fetch(host, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  })

  if (!res.ok) {
    return `data:text/html;charset=utf-8,${encodeURIComponent(content)}`
  }

  return `${domain}/${key}`
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

function buildDemoHtml(question) {
  const observation = getObservationData(question)
  const challenge = getChallengeData(question)

  const knownConditionCards = observation.knownConditions.length > 0
    ? observation.knownConditions.map((item) => `
      <div class="condition-card">${escapeHtml(item.text)}</div>
    `).join('')
    : '<div class="empty-card">暂无已知条件</div>'

  const hiddenConditionCards = observation.hiddenConditions.length > 0
    ? observation.hiddenConditions.map((item) => `
      <div class="condition-card">${escapeHtml(item.text)}</div>
    `).join('')
    : '<div class="empty-card">暂无隐含条件</div>'

  const challengeCards = challenge.steps.length > 0
    ? challenge.steps.map((step, index) => `
      <div class="challenge-card">
        <div class="challenge-head">
          <span class="challenge-step">步骤 ${escapeHtml(String(step.step ?? index + 1))}</span>
          <span class="challenge-question">${escapeHtml(step.question || '未提供问题')}</span>
        </div>
        <div class="challenge-hint">${escapeHtml(step.hint || '未提供提示')}</div>
      </div>
    `).join('')
    : '<div class="empty-card">暂无挑战步骤</div>'

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>互动演示</title>
  <style>
    :root {
      --bg: #FAFAFA;
      --card: #FFFFFF;
      --text: #171717;
      --body: #4D4D4D;
      --mute: #888888;
      --blue: #0070F3;
      --gradient: linear-gradient(135deg, #7928CA 0%, #FF0080 100%);
      --border: #EAEAEA;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top, rgba(121,40,202,0.08), transparent 30%), var(--bg);
      color: var(--text);
    }
    .wrap {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px 18px 40px;
    }
    .zone, .panel, .condition-card, .challenge-card, .empty-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(17,17,17,0.04);
    }
    .zone {
      padding: 20px;
      margin-bottom: 16px;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(0,112,243,0.08);
      color: var(--blue);
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .title {
      margin: 0 0 10px;
      font-size: 20px;
      line-height: 1.3;
    }
    .desc {
      margin: 0;
      color: var(--body);
      font-size: 14px;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    .panel {
      padding: 18px;
      margin-bottom: 16px;
    }
    .panel h2 {
      margin: 0 0 12px;
      font-size: 15px;
    }
    .layout {
      display: grid;
      gap: 16px;
    }
    .zone-title {
      display: inline-flex;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #7928CA 0%, #FF0080 100%);
    }
    .subcard {
      margin-top: 16px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: #FAFAFA;
      padding: 16px;
    }
    .subcard-title {
      font-size: 12px;
      color: var(--mute);
      font-weight: 600;
    }
    .subcard-body {
      margin-top: 8px;
      font-size: 14px;
      line-height: 1.7;
      color: var(--text);
      white-space: pre-wrap;
    }
    .hint-list {
      display: grid;
      gap: 10px;
    }
    .condition-card {
      padding: 12px 14px;
      font-size: 14px;
      line-height: 1.7;
      color: var(--text);
    }
    .empty-card {
      padding: 18px;
      font-size: 13px;
      color: var(--mute);
      background: #FAFAFA;
      border-style: dashed;
    }
    .challenge-list {
      display: grid;
      gap: 12px;
    }
    .challenge-card {
      padding: 16px;
    }
    .challenge-head {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }
    .challenge-step {
      flex-shrink: 0;
      border-radius: 999px;
      background: rgba(0,112,243,0.08);
      color: var(--blue);
      font-size: 11px;
      font-weight: 700;
      padding: 5px 10px;
    }
    .challenge-question {
      flex: 1;
      min-width: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
      text-align: left;
      line-height: 1.6;
    }
    .challenge-hint {
      margin-top: 10px;
      border-radius: 16px;
      background: #FAFAFA;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.7;
      color: var(--body);
    }
    .logic-json {
      margin-top: 16px;
      border-radius: 18px;
      border: 1px solid var(--border);
      background: #FAFAFA;
      padding: 14px;
    }
    .logic-json pre {
      margin: 0;
      overflow: auto;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      white-space: pre-wrap;
    }
    .goal-target {
      margin-top: 4px;
      color: var(--blue);
      font-size: 12px;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="zone">
      <div class="zone-title">1. 观察区</div>
      <div class="subcard">
        <div class="subcard-title">题目原文</div>
        <div class="subcard-body">${escapeHtml(observation.questionText)}</div>
      </div>

      <div class="subcard">
        <div class="subcard-title">已知条件</div>
        <div class="hint-list">
          ${knownConditionCards}
        </div>
      </div>

      <div class="subcard">
        <div class="subcard-title">隐含条件</div>
        <div class="hint-list">
          ${hiddenConditionCards}
        </div>
      </div>

      <div class="subcard">
        <div class="subcard-title">求解目标</div>
        <div class="subcard-body">
          ${escapeHtml(observation.goalText)}
          <div class="goal-target">${escapeHtml(observation.goalTarget)}</div>
        </div>
      </div>
    </section>

    <section class="zone">
      <div class="zone-title" style="background: linear-gradient(135deg, #0070F3 0%, #7928CA 100%);">2. 发现区</div>
      <div class="empty-card" style="min-height: 180px; display: flex; align-items: center; justify-content: center; text-align: center;">
        先留空白，后续再填发现区组件
      </div>
    </section>

    <section class="zone">
      <div class="zone-title">3. 挑战区</div>
      <div class="challenge-list">
        ${challengeCards}
      </div>
    </section>
  </div>
</body>
</html>`
}

function normalizeBody(body) {
  if (!body) return {}
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return {}
    }
  }
  return body
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  try {
    const body = normalizeBody(req.body)
    const questionId = safeText(body.questionId)
    if (!questionId) {
      return res.status(400).json({ success: false, error: '缺少 questionId' })
    }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '未登录' })
    }

    const userData = await getCurrentUser(authHeader)
    const userId = userData.id

    const { data: questionRows, error: questionError } = await query('user_questions', {
      filters: { id: questionId },
      select: 'id,user_id,question_text,math_analysis_json,logic_analysis_json,tutor_analysis_json,status',
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

    if (safeText(question.status) === 'pending') {
      return res.status(400).json({ success: false, error: '请先完成基础分析' })
    }

    const { data: demoRows, error: demoError } = await query('question_demos', {
      filters: { question_id: questionId },
      select: 'id',
      order: 'created_at',
      ascending: false,
    })
    if (demoError) {
      return res.status(500).json({ success: false, error: `读取演示记录失败: ${demoError}` })
    }

    const title = `演示 ${Array.isArray(demoRows) ? demoRows.length + 1 : 1}`
    const html = buildDemoHtml(question)
    const htmlUrl = await uploadHtmlContent(html, questionId)

    const demoInsert = await insert('question_demos', {
      question_id: questionId,
      html_url: htmlUrl,
      title,
    })

    if (demoInsert.error || !demoInsert.data || demoInsert.data.length === 0) {
      return res.status(500).json({ success: false, error: `创建演示失败: ${demoInsert.error || '未知错误'}` })
    }

    await updateWhere('user_questions', { id: questionId }, { status: 'uploaded' })

    return res.status(200).json({
      success: true,
      demo: demoInsert.data[0],
      htmlUrl,
    })
  } catch (error) {
    console.error('[user-questions/generate-interaction] error:', error)
    return res.status(500).json({
      success: false,
      error: error?.message || '生成互动失败',
    })
  }
}
