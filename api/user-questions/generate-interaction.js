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

function toPrettyJson(value) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return '{}'
  }
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
  const questionText = escapeHtml(question.question_text || '')
  const logicAnalysis = question.logic_analysis_json || {}
  const tutorAnalysis = question.tutor_analysis_json || {}
  const mathAnalysis = question.math_analysis_json || {}
  const logicBlocks = Array.isArray(logicAnalysis.logic_blocks) ? logicAnalysis.logic_blocks : []

  const blockCards = logicBlocks.length > 0
    ? logicBlocks.map((block, index) => {
        const step = escapeHtml(String(block?.step ?? index + 1))
        const type = escapeHtml(block?.type || '逻辑块')
        const mathObject = escapeHtml(block?.math_object || '')
        const visualObject = escapeHtml(block?.visual_object || '')
        return `
          <div class="block-card">
            <div class="block-head">
              <span class="step">${step}</span>
              <span class="type">${type}</span>
            </div>
            <div class="block-body">
              <div><span class="label">数学对象</span><span>${mathObject || '未提供'}</span></div>
              <div><span class="label">素材</span><span>${visualObject || '未提供'}</span></div>
            </div>
          </div>
        `
      }).join('')
    : '<div class="empty">当前题目还没有可视化的逻辑块</div>'

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
      max-width: 760px;
      margin: 0 auto;
      padding: 24px 18px 40px;
    }
    .hero, .panel, .block-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      box-shadow: 0 10px 30px rgba(17,17,17,0.04);
    }
    .hero {
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
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .meta-item {
      padding: 12px 14px;
      border-radius: 14px;
      background: #FAFAFA;
      color: var(--body);
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .block-list {
      display: grid;
      gap: 12px;
    }
    .block-card {
      padding: 14px;
      transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
    }
    .block-card.active {
      border-color: rgba(0,112,243,0.45);
      box-shadow: 0 16px 34px rgba(0,112,243,0.12);
      transform: translateY(-1px);
    }
    .block-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .step {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      border-radius: 999px;
      background: rgba(121,40,202,0.08);
      color: #7928CA;
      font-weight: 700;
      font-size: 13px;
      padding: 0 10px;
    }
    .type {
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
    }
    .block-body {
      display: grid;
      gap: 8px;
      color: var(--body);
      font-size: 13px;
      line-height: 1.7;
    }
    .label {
      display: inline-block;
      margin-right: 8px;
      color: var(--mute);
      font-size: 12px;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
    .btn {
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      background: var(--blue);
      cursor: pointer;
      transition: transform .2s ease, opacity .2s ease;
    }
    .btn:active { transform: scale(0.98); }
    .btn.secondary {
      background: var(--gradient);
    }
    .status {
      margin-top: 10px;
      color: var(--mute);
      font-size: 13px;
    }
    .pulse {
      animation: pulse 1.4s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: .7; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.02); }
    }
    .empty {
      padding: 18px;
      border-radius: 14px;
      background: #FAFAFA;
      color: var(--mute);
      font-size: 13px;
    }
    pre {
      margin: 0;
      padding: 14px;
      border-radius: 14px;
      background: #FAFAFA;
      color: #333;
      overflow: auto;
      font-size: 12px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="eyebrow">互动演示 · 自动生成</div>
      <h1 class="title">题目互动预览</h1>
      <p class="desc">${questionText}</p>
      <div class="toolbar">
        <button class="btn" id="toggleBtn">开始互动</button>
        <button class="btn secondary" id="stepBtn">查看步骤</button>
      </div>
      <div class="status pulse" id="statusText">点击按钮后会高亮每一步逻辑块</div>
    </section>

    <section class="panel">
      <h2>分析摘要</h2>
      <div class="meta-grid">
        <div class="meta-item"><strong>math_analysis_json</strong><pre>${escapeHtml(toPrettyJson(mathAnalysis))}</pre></div>
        <div class="meta-item"><strong>tutor_analysis_json</strong><pre>${escapeHtml(toPrettyJson(tutorAnalysis))}</pre></div>
      </div>
    </section>

    <section class="panel">
      <h2>逻辑步骤</h2>
      <div class="block-list" id="blockList">
        ${blockCards}
      </div>
    </section>
  </div>

  <script>
    const blocks = Array.from(document.querySelectorAll('.block-card'))
    const toggleBtn = document.getElementById('toggleBtn')
    const stepBtn = document.getElementById('stepBtn')
    const statusText = document.getElementById('statusText')
    let index = -1
    let timer = null

    function clearActive() {
      blocks.forEach((node) => node.classList.remove('active'))
    }

    function stop() {
      if (timer) clearInterval(timer)
      timer = null
      index = -1
      clearActive()
      statusText.textContent = '已停止互动预览'
    }

    function nextStep() {
      if (!blocks.length) return
      index = (index + 1) % blocks.length
      clearActive()
      const node = blocks[index]
      if (node) node.classList.add('active')
      statusText.textContent = '当前高亮第 ' + (index + 1) + ' 步'
    }

    toggleBtn.addEventListener('click', () => {
      if (timer) {
        stop()
        toggleBtn.textContent = '开始互动'
        return
      }
      nextStep()
      timer = setInterval(nextStep, 1400)
      toggleBtn.textContent = '停止互动'
      statusText.textContent = '正在播放互动演示...'
    })

    stepBtn.addEventListener('click', () => {
      if (!timer) {
        nextStep()
      }
    })
  </script>
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
    const htmlUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)

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
