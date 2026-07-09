import crypto from 'crypto'
import { query, insert, updateWhere } from '../../server/lib/supabase-admin.js'
import { deepseekJson, isDeepSeekConfigured } from '../../server/lib/deepseek.js'
import { getSupabaseEnv } from '../../server/lib/supabase-env.js'
import { buildComponentDemoHtml, getRequestOrigin } from '../../server/lib/component-demo-html.js'

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

function escapeHtmlRaw(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

function getJsonValue(value, fallback = {}) {
  if (value === null || value === undefined) return fallback
  return value
}

function hasRenderableLineAnalysis(value) {
  if (Array.isArray(value)) return value.length > 0
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value.elements) && value.elements.length > 0) return true
  if (Array.isArray(value.rules) && value.rules.length > 0) return true
  if (typeof value.interactionType === 'string') return true
  return Object.keys(value).length > 0
}

async function getConfigValue(key) {
  const { data, error } = await query('configs', {
    filters: { key },
    select: 'key,value',
    limit: 1,
  })
  if (error) throw new Error(`读取配置 ${key} 失败: ${error}`)
  const row = data?.[0]
  return safeText(row?.value)
}

function buildPrompt(configValue, questionText, context = {}) {
  let promptValue = configValue
  const hasMathAnalysisPlaceholder = promptValue.includes('{{math_analysis_json}}')
  const hasLogicAnalysisPlaceholder = promptValue.includes('{{logic_analysis_json}}')

  if (context.mathAnalysisJson !== undefined) {
    promptValue = promptValue.replaceAll(
      '{{math_analysis_json}}',
      JSON.stringify(context.mathAnalysisJson, null, 2),
    )
  }
  if (context.logicAnalysisJson !== undefined) {
    promptValue = promptValue.replaceAll(
      '{{logic_analysis_json}}',
      JSON.stringify(context.logicAnalysisJson, null, 2),
    )
  }

  const sections = [
    promptValue,
    '',
    '题目原文：',
    questionText,
  ]

  if (context.mathAnalysisJson && !hasMathAnalysisPlaceholder) {
    sections.push('', 'math_analysis_json：', JSON.stringify(context.mathAnalysisJson, null, 2))
  }

  if (context.logicAnalysisJson && !hasLogicAnalysisPlaceholder) {
    sections.push('', 'logic_analysis_json：', JSON.stringify(context.logicAnalysisJson, null, 2))
  }

  if (context.tutorAnalysisJson) {
    sections.push('', 'tutor_analysis_json：', JSON.stringify(context.tutorAnalysisJson, null, 2))
  }

  if (context.outputInstruction) {
    sections.push('', context.outputInstruction)
  }

  sections.push('', '要求：只输出 JSON，不要输出 markdown、解释或多余文本。')
  return sections.join('\n')
}

async function runLineAnalysis(question) {
  if (!isDeepSeekConfigured()) {
    throw new Error('DeepSeek 未配置')
  }

  const prompt = await getConfigValue('line_analysis')
  if (!prompt) {
    throw new Error('configs 中缺少 key = line_analysis 的配置')
  }

  const result = await deepseekJson({
    systemPrompt: '你是一个严格输出 JSON 的线段图分析助手。请只返回 JSON 对象或数组。',
    userPrompt: buildPrompt(prompt, safeText(question.question_text), {
      mathAnalysisJson: question.math_analysis_json,
      logicAnalysisJson: question.logic_analysis_json,
      tutorAnalysisJson: question.tutor_analysis_json,
      outputInstruction: '请输出用于线段图发现区的 line_analysis_json。优先返回 {"elements":[...]} 结构，elements 只使用 line / rect / circle / text / brace / button 六种基础原子，所有坐标限制在 700×480 画布内。',
    }),
    temperature: 0.2,
  })

  if (!result || typeof result !== 'object') {
    throw new Error('line_analysis 返回结果非法')
  }

  return result
}

function getObservationData(question) {
  const mathAnalysis = getJsonValue(question.math_analysis_json, {})
  const goal = mathAnalysis.goal && typeof mathAnalysis.goal === 'object' ? mathAnalysis.goal : {}
  return {
    questionText: safeText(question.question_text || ''),
    goalText: safeText(goal.text || question.question_text || ''),
    goalTarget: safeText(goal.target || '求解目标'),
    knownConditions: normalizeArray(mathAnalysis.known_conditions).map((item) => ({
      text: safeText(item?.name || item?.text || ''),
      unit: safeText(item?.unit || ''),
      value: item?.value,
    })).filter((item) => item.text),
    hiddenConditions: normalizeArray(mathAnalysis.hidden_conditions).map((item) => ({
      text: safeText(item?.text || ''),
    })).filter((item) => item.text),
  }
}

function getConditionCandidates(condition) {
  if (condition?.value === undefined || condition?.value === null) return []
  const value = String(condition.value).trim()
  const unit = safeText(condition.unit || '')
  const timeInLabel = safeText(condition.text).match(/\b\d{1,2}:\d{2}\b/)?.[0] || ''
  return Array.from(new Set([
    unit ? `${value} ${unit}` : '',
    unit ? `${value}${unit}` : '',
    timeInLabel,
    value,
  ].filter(Boolean))).sort((left, right) => right.length - left.length)
}

function renderAnnotatedQuestion(question, conditions) {
  const used = new Set()
  const pieces = []
  let cursor = 0

  while (cursor < question.length) {
    let match
    conditions.forEach((condition, conditionIndex) => {
      if (used.has(conditionIndex)) return
      getConditionCandidates(condition).forEach((candidate) => {
        const index = question.indexOf(candidate, cursor)
        if (index < 0) return
        if (!match || index < match.index || (index === match.index && candidate.length > match.text.length)) {
          match = { conditionIndex, index, text: candidate }
        }
      })
    })

    if (!match) {
      pieces.push(escapeHtmlRaw(question.slice(cursor)))
      break
    }
    if (match.index > cursor) pieces.push(escapeHtmlRaw(question.slice(cursor, match.index)))
    pieces.push(`<span class="known-condition-box">${escapeHtmlRaw(match.text)}<span class="edu-scaffold"><span class="arrow-up"></span><span class="condition-name">${escapeHtml(conditions[match.conditionIndex].text)}</span></span></span>`)
    used.add(match.conditionIndex)
    cursor = match.index + match.text.length
  }

  return pieces.length > 0 ? pieces.join('') : escapeHtmlRaw(question)
}

function getChallengeData(question) {
  const tutorAnalysis = getJsonValue(question.tutor_analysis_json, {})
  return {
    steps: normalizeArray(tutorAnalysis.challenge_steps).map((item, index) => ({
      step: item?.step ?? index + 1,
      hint: safeText(item?.hint || ''),
      question: safeText(item?.question || ''),
    })).filter((item) => item.hint || item.question),
  }
}

function toStepNumber(value, fallback) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getDiscoveryData(question) {
  const challengeByStep = new Map(
    getChallengeData(question).steps.map((item, index) => [
      toStepNumber(item.step, index + 1),
      item,
    ]),
  )

  return normalizeArray(getJsonValue(question.component_analysis_json, []))
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item && typeof item === 'object')
    .filter(({ item }) => ['Combine', 'Separate', 'Replicate', 'Partition'].includes(safeText(item.component)))
    .sort((left, right) => {
      const leftStep = toStepNumber(left.item?.step_info?.current, left.index + 1)
      const rightStep = toStepNumber(right.item?.step_info?.current, right.index + 1)
      return leftStep - rightStep || left.index - right.index
    })
    .map(({ item, index }) => {
      const step = toStepNumber(item?.step_info?.current, index + 1)
      return { config: item, step, challenge: challengeByStep.get(step) }
    })
}

function renderModelBars(config) {
  const component = safeText(config?.component)
  const bars = normalizeArray(config?.bars)
  const primary = bars[0] || {}
  const color = safeText(primary.color) || '#7928CA'
  const value = primary.value ?? ''
  const unit = safeText(primary.unit || config?.step_info?.unit || '')

  if (component === 'Partition') {
    const parts = Math.max(1, Math.min(30, Math.floor(Number(config?.parts) || 1)))
    return `<div class="model-row model-grid">${Array.from({ length: parts }, () => `
      <div class="model-cell" style="background:${escapeHtml(color)}"><span>${escapeHtml(String(value))}</span></div>
    `).join('')}</div>`
  }

  if (component === 'Replicate') {
    const multiplier = Math.max(1, Math.min(30, Math.floor(Number(config?.multiplier) || 1)))
    return `<div class="model-row model-grid">${Array.from({ length: multiplier }, (_, index) => `
      <div class="model-cell ${index > 0 ? 'model-clone' : ''}" style="background:${escapeHtml(color)}"><span>${escapeHtml(String(value))}</span></div>
    `).join('')}</div>`
  }

  return `<div class="model-row">${bars.map((bar, index) => `
    <div class="model-bar ${component === 'Separate' && index === 1 ? 'model-cut' : ''}" style="background:${escapeHtml(safeText(bar?.color) || (index ? '#FF0080' : '#7928CA'))}">
      ${escapeHtml(safeText(bar?.label) || `数量 ${index + 1}`)}：${escapeHtml(String(bar?.value ?? ''))}${escapeHtml(safeText(bar?.unit || unit))}
    </div>
  `).join('')}</div>`
}

function renderDiscoveryBlock({ config, step, challenge }, index) {
  const component = safeText(config?.component)
  const answerName = safeText(config?.step_info?.answer_name || '结果')
  const answerValue = config?.step_info?.answer_value ?? ''
  const answerUnit = safeText(config?.step_info?.unit || '')
  const actionLabel = {
    Combine: '合并数量',
    Separate: '点击剪刀',
    Replicate: '叠加倍数',
    Partition: '均分总量',
  }[component] || '开始互动'

  return `
    <article class="discovery-block" data-discovery-block>
      <div class="discovery-prompt">
        <span class="discovery-step">步骤 ${escapeHtml(String(step))}</span>
        <div>
          <div class="discovery-question">${escapeHtml(challenge?.question || '请观察下面的互动，想一想这一步该怎样解决？')}</div>
          ${challenge?.hint ? `<div class="discovery-hint">提示：${escapeHtml(challenge.hint)}</div>` : ''}
        </div>
      </div>
      <div class="component-stage">
        <div class="component-formula">${escapeHtml(safeText(config?.formula || component))}</div>
        <div class="model-track">${renderModelBars(config)}</div>
        <div class="component-answer" data-component-answer>${escapeHtml(answerName)}：${escapeHtml(String(answerValue))}${escapeHtml(answerUnit)}</div>
      </div>
      <div class="component-actions">
        <button type="button" class="reset-button" data-reset>重置</button>
        <button type="button" class="action-button" data-run>${escapeHtml(actionLabel)}</button>
      </div>
      <span class="sr-only">逻辑块 ${index + 1}：${escapeHtml(component)}</span>
    </article>`
}

function urlsafe(value) {
  const buffer = typeof value === 'string' ? Buffer.from(value) : value
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
}

function normalizePublicUrlDomain(value) {
  const domain = safeText(value).replace(/\/+$/, '')
  if (!domain) return ''
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`
}

async function uploadHtmlContent(content, refId) {
  const ak = process.env.QINIU_ACCESS_KEY
  const sk = process.env.QINIU_SECRET_KEY
  const domain = normalizePublicUrlDomain(process.env.QINIU_DOMAIN)
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
  const discovery = getDiscoveryData(question)

  const hiddenConditionText = observation.hiddenConditions.length > 0
    ? observation.hiddenConditions.map((item) => `
      <span class="hidden-condition">${escapeHtml(item.text)}</span>
    `).join('')
    : ''

  const discoveryBlocks = discovery.length > 0
    ? discovery.map(renderDiscoveryBlock).join('')
    : '<div class="empty-card discovery-empty">互动组件配置暂不可用</div>'

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
    .zone, .panel, .empty-card {
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
    .question-container { margin-top: 8px; border: 1px solid #F1F5F9; border-radius: 16px; background: #F8FAFC; padding: 24px 32px 48px; }
    .question-text { margin: 0; color: #334155; font-size: 16px; font-weight: 500; line-height: 3.6; letter-spacing: .5px; text-align: left; white-space: pre-wrap; }
    .known-condition-box { position: relative; display: inline-block; box-sizing: border-box; margin: 0 4px; border: 2px dashed #EF4444; border-radius: 8px; background: #FEF2F2; padding: 0 8px; color: #EF4444; font-weight: 700; line-height: 1.4; vertical-align: middle; white-space: nowrap; }
    .edu-scaffold { position: absolute; top: 100%; left: 50%; z-index: 10; display: inline-flex; flex-direction: column; align-items: center; margin-top: 4px; transform: translateX(-50%); }
    .arrow-up { width: 0; height: 0; margin-bottom: 2px; border-right: 5px solid transparent; border-bottom: 6px solid #EF4444; border-left: 5px solid transparent; }
    .condition-name { border-radius: 4px; background: #EF4444; padding: 2px 8px; color: #fff; font-size: 11px; font-weight: 700; line-height: 1.2; letter-spacing: .5px; white-space: nowrap; box-shadow: 0 2px 6px rgba(239,68,68,.15); }
    .observation-summary { display: grid; gap: 8px; margin-top: 10px; }
    .hidden-list { display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 0 4px; }
    .hidden-condition { color: #7928CA; font-size: 12px; line-height: 1.6; }
    .goal-card { border-radius: 12px; background: #EFF6FF; padding: 8px 12px; }
    .goal-text { color: #334155; font-size: 12px; font-weight: 600; line-height: 1.6; }
    .empty-card {
      padding: 18px;
      font-size: 13px;
      color: var(--mute);
      background: #FAFAFA;
      border-style: dashed;
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
      color: var(--blue);
      font-size: 11px;
      line-height: 1.5;
      text-align: left;
    }
    .discovery-list { display: grid; gap: 18px; margin-top: 16px; }
    .discovery-block { border: 1px solid var(--border); border-radius: 24px; padding: 18px; background: #fff; }
    .discovery-prompt { display: flex; align-items: flex-start; gap: 12px; border: 1px solid #DCE8F8; border-radius: 18px; background: #F8FBFF; padding: 14px; }
    .discovery-step { flex: 0 0 auto; border-radius: 999px; background: var(--blue); color: #fff; padding: 5px 10px; font-size: 11px; font-weight: 700; }
    .discovery-question { color: var(--text); font-size: 14px; font-weight: 650; line-height: 1.6; }
    .discovery-hint { margin-top: 4px; color: #777; font-size: 12px; line-height: 1.6; }
    .component-stage { margin-top: 14px; min-height: 190px; border: 1px solid #E2E8F0; border-radius: 20px; padding: 20px; overflow: hidden; }
    .component-formula { width: fit-content; margin: 0 auto 22px; border-radius: 999px; background: #F1F5F9; padding: 8px 20px; color: #475569; font-size: 15px; font-weight: 700; }
    .model-track { max-width: 560px; margin: 0 auto; border: 2px dashed #CBD5E1; border-radius: 16px; background: #F8FAFC; padding: 5px; }
    .model-row { display: flex; min-height: 58px; gap: 4px; }
    .model-bar { flex: 1 1 0; display: flex; align-items: center; justify-content: center; border-radius: 11px; color: #fff; padding: 8px; font-size: 12px; font-weight: 700; text-align: center; transition: transform .45s, opacity .45s; }
    .model-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(12px, 1fr)); gap: 3px; }
    .model-cell { min-width: 0; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: #fff; font-size: 9px; font-weight: 800; transform: scale(.72); opacity: .18; transition: transform .35s, opacity .35s; }
    .component-answer { margin-top: 16px; color: #059669; font-size: 18px; font-weight: 800; text-align: center; opacity: 0; transform: translateY(-5px); transition: opacity .35s, transform .35s; }
    .component-actions { display: flex; gap: 10px; margin-top: 14px; }
    .component-actions button { border: 0; border-radius: 12px; padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .reset-button { border: 1px solid #CBD5E1 !important; background: #fff; color: #64748B; }
    .action-button { background: #075DCE; color: #fff; }
    .discovery-block.is-complete .model-cell { transform: scale(1); opacity: 1; }
    .discovery-block.is-complete .model-cut { transform: translateY(18px) rotate(2deg); opacity: .48; }
    .discovery-block.is-complete .component-answer { opacity: 1; transform: translateY(0); }
    .discovery-empty { min-height: 180px; display: flex; align-items: center; justify-content: center; text-align: center; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media (max-width: 640px) {
      .discovery-block { padding: 12px; }
      .discovery-prompt { flex-direction: column; }
      .component-stage { padding: 14px 10px; }
      .model-bar { font-size: 10px; }
      .question-container { padding: 20px 18px 44px; }
      .question-text { font-size: 15px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="zone">
      <div class="zone-title">1. 观察区</div>
      <div class="subcard">
        <div class="subcard-title">题目原文</div>
        <div class="question-container">
          <p class="question-text">${renderAnnotatedQuestion(observation.questionText, observation.knownConditions)}</p>
        </div>
      </div>

      <div class="observation-summary">
        ${hiddenConditionText ? `<div class="hidden-list">${hiddenConditionText}</div>` : ''}
        <div class="goal-card">
          <div class="goal-text">${escapeHtml(observation.goalText)}</div>
          <div class="goal-target">${escapeHtml(observation.goalTarget)}</div>
        </div>
      </div>
    </section>

    <section class="zone">
      <div class="zone-title" style="background: linear-gradient(135deg, #0070F3 0%, #7928CA 100%);">2. 发现区</div>
      <div class="discovery-list">
        ${discoveryBlocks}
      </div>
    </section>
  </div>
  <script>
    document.querySelectorAll('[data-discovery-block]').forEach(function (block) {
      block.querySelector('[data-run]').addEventListener('click', function () {
        block.classList.add('is-complete')
      })
      block.querySelector('[data-reset]').addEventListener('click', function () {
        block.classList.remove('is-complete')
      })
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
    const mode = body.mode === 'vivid' ? 'vivid' : 'basic'
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
      select: 'id,user_id,question_text,math_analysis_json,logic_analysis_json,tutor_analysis_json,component_analysis_json,line_analysis_json,status',
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
      select: 'id,title',
      order: 'created_at',
      ascending: false,
    })
    if (demoError) {
      return res.status(500).json({ success: false, error: `读取演示记录失败: ${demoError}` })
    }

    const hasBasicInteraction = Array.isArray(demoRows) && demoRows.some((demo) => {
      const demoTitle = safeText(demo?.title)
      return /^基础互动\s*\d+$/.test(demoTitle) || /^演示\s+\d+$/.test(demoTitle)
    })
    if (mode === 'basic' && hasBasicInteraction) {
      return res.status(409).json({ success: false, error: '基础互动已经生成，不能重复生成' })
    }

    const vividCount = Array.isArray(demoRows)
      ? demoRows.filter((demo) => /^演示\d+$/.test(safeText(demo?.title))).length
      : 0
    const title = mode === 'vivid' ? `演示${vividCount + 1}` : '基础互动 1'

    if (mode === 'vivid') {
      let lineAnalysisJson = question.line_analysis_json
      if (!hasRenderableLineAnalysis(lineAnalysisJson)) {
        lineAnalysisJson = await runLineAnalysis(question)
        const saveResult = await updateWhere('user_questions', { id: questionId }, { line_analysis_json: lineAnalysisJson })
        if (saveResult.error) {
          return res.status(500).json({ success: false, error: `保存 line_analysis_json 失败: ${saveResult.error}` })
        }
        question.line_analysis_json = lineAnalysisJson
      }
    }

    const html = buildComponentDemoHtml(
      question,
      getRequestOrigin(req),
      {},
      { discoveryMode: mode === 'vivid' ? 'empty' : 'components' },
    ) || buildDemoHtml(question)
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
