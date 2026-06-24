/**
 * POST /api/generate/demo
 *
 * 两种调用方式：
 *   新提交: { questionText: "3米等于多少厘米" }
 *   重新生成: { questionId: "xxx-xxx", regenerate: true }
 *
 * 完整链路：
 *   Step 0: 验证是否为数学题（仅新提交）→ 非数学题不落库
 *   Step 1: 保存题目到 user_questions（仅新提交）
 *   Step 2: AI 选择最匹配的 core_discovery
 *   Step 3: 基于题型配置做结构化分析
 *   Step 4: 基于 analysis_json + 题型配置生成渲染计划
 *   Step 5: 模板/提示词生成 HTML
 *   Step 6: 存入 question_demos + 生成日志 + 标记 completed
 */

import { consumeGeneration } from '../../server/lib/membership.js'
import { getSupabaseEnv } from '../../server/lib/supabase-env.js'
import crypto from 'crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const aiFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../server/lib/ai.js')
const aiStamp = fs.statSync(aiFile).mtimeMs
const { callAI } = await import(`${pathToFileURL(aiFile).href}?t=${aiStamp}`)

const { url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY } = getSupabaseEnv()

// ─── JWT 载荷解码（轻量，无依赖） ─────────────────
function getUserIdFromToken(req) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    if (!token || token.split('.').length !== 3) return null
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
    )
    return payload.sub || null
  } catch {
    return null
  }
}

function normalizeTypeName(value) {
  return String(value || '')
    .trim()
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’。！？!?.,,;；：:]+$/g, '')
    .replace(/\s+/g, '')
}

function normalizeCoreDiscovery(value) {
  return normalizeTypeName(value)
}

function looksLikeMathQuestion(text) {
  const normalized = String(text || '').replace(/\s+/g, '')
  if (!normalized) return false

  const numberMatches = normalized.match(/\d+(?:\.\d+)?/g) || []
  const hasNumber = numberMatches.length > 0
  const hasMultipleNumbers = numberMatches.length >= 2
  const hasEquationOrArithmetic = /[+\-×xX*/=()（）]/.test(normalized)
  const mathKeywords = [
    '数学', '算', '计算', '求', '求出', '多少', '几', '平均', '平均每天', '一共', '总共',
    '合计', '还剩', '相差', '比', '完成', '分成', '分配', '倍', '倍数', '工程', '铺设',
    '路程', '速度', '时间', '单价', '总价', '每米', '每天', '每份', '每个', '米', '厘米',
    '毫米', '分米', '千米', '元', '角', '分', '吨', '千克', '公斤', '克', '小时', '分钟',
    '秒', '人', '只', '个', '箱', '张', '本', '棵', '条', '辆', '块', '枚', '支',
  ]
  const hasMathKeyword = mathKeywords.some((keyword) => normalized.includes(keyword))
  const hasQuestionForm = /(?=.*(如果|已知|要求|求|平均|每|还剩|相差|完成|多少|几))/.test(normalized)

  if (hasEquationOrArithmetic) return true
  if (hasMultipleNumbers && (hasMathKeyword || hasQuestionForm)) return true
  if (hasNumber && /多少|几|求|平均|完成|相差|还剩|每/.test(normalized) && hasMathKeyword) return true
  return false
}

function findMatchedTypeByCoreDiscoveryOrName(allTypes, rawValue) {
  const normalizedValue = normalizeCoreDiscovery(rawValue)
  if (!normalizedValue) return { type: null, matchedBy: null }

  const normalizedMap = allTypes.map((type) => ({
    type,
    normalizedCoreDiscovery: normalizeCoreDiscovery(type.core_discovery),
    normalizedName: normalizeTypeName(type.name),
  }))

  const exactCoreDiscovery = normalizedMap.find(({ normalizedCoreDiscovery: candidate }) => candidate === normalizedValue)
  if (exactCoreDiscovery) {
    return { type: exactCoreDiscovery.type, matchedBy: 'core_discovery' }
  }

  const exactName = normalizedMap.find(({ normalizedName }) => normalizedName === normalizedValue)
  if (exactName) {
    return { type: exactName.type, matchedBy: 'name' }
  }

  const looseCoreDiscovery = normalizedMap.find(({ normalizedCoreDiscovery: candidate }) =>
    normalizedValue.includes(candidate) || candidate.includes(normalizedValue)
  )
  if (looseCoreDiscovery) {
    return { type: looseCoreDiscovery.type, matchedBy: 'core_discovery' }
  }

  const looseName = normalizedMap.find(({ normalizedName }) =>
    normalizedValue.includes(normalizedName) || normalizedName.includes(normalizedValue)
  )
  if (looseName) {
    return { type: looseName.type, matchedBy: 'name' }
  }

  return { type: null, matchedBy: null }
}

function buildTypeSelectionPrompt(allTypes) {
  return allTypes
    .map((type) => [
      `name: ${type.name || ''}`,
      `core_discovery: ${type.core_discovery || ''}`,
    ].join('\n'))
    .join('\n\n')
}

function getCoreDiscoveries(allTypes) {
  return allTypes.map((type) => type.core_discovery).filter(Boolean)
}

function logTypeMatchIssue(kind, payload) {
  console.warn(`[generate/demo] ${kind}`, payload)
}

function safeJsonParse(value, fallback) {
  if (value == null || value === '') return fallback
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function extractJsonLikeText(text) {
  const source = String(text || '').trim()
  if (!source) return ''

  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const start = source.search(/[\[{]/)
  if (start === -1) return source

  let depth = 0
  let inString = false
  let escaped = false
  let begin = -1
  const openChar = source[start]
  const closeChar = openChar === '{' ? '}' : ']'

  for (let i = start; i < source.length; i++) {
    const ch = source[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === openChar) {
      if (depth === 0) begin = i
      depth++
      continue
    }
    if (ch === closeChar) {
      depth--
      if (depth === 0 && begin !== -1) {
        return source.slice(begin, i + 1).trim()
      }
    }
  }

  return source
}

function repairJsonText(text) {
  let source = extractJsonLikeText(text).trim()
  if (!source) return ''

  source = source.replace(/^\uFEFF/, '').trim()
  source = source.replace(/,\s*([}\]])/g, '$1')

  if (
    ((source.startsWith('"') && source.endsWith('"')) || (source.startsWith('“') && source.endsWith('”')))
    && (source.includes('{') || source.includes('['))
  ) {
    source = source.slice(1, -1).trim()
  }

  const stack = []
  let inString = false
  let escaped = false

  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '{' || ch === '[') {
      stack.push(ch)
      continue
    }
    if (ch === '}' || ch === ']') {
      const last = stack[stack.length - 1]
      if ((ch === '}' && last === '{') || (ch === ']' && last === '[')) {
        stack.pop()
      }
    }
  }

  if (stack.length > 0) {
    const closers = stack.reverse().map((ch) => (ch === '{' ? '}' : ']')).join('')
    source += closers
  }

  return source
}

function parseAnalysisJson(content) {
  if (!content) return {}
  if (typeof content === 'object') return content

  const direct = safeJsonParse(content, null)
  if (direct && typeof direct === 'object') return direct
  if (typeof direct === 'string') {
    const parsedAgain = safeJsonParse(direct, null)
    if (parsedAgain && typeof parsedAgain === 'object') return parsedAgain
  }

  const extracted = extractJsonLikeText(content)
  const parsed = safeJsonParse(extracted, null)
  if (parsed && typeof parsed === 'object') return parsed

  const repaired = repairJsonText(extracted || content)
  const repairedParsed = safeJsonParse(repaired, null)
  if (repairedParsed && typeof repairedParsed === 'object') return repairedParsed
  if (typeof repairedParsed === 'string') {
    const parsedAgain = safeJsonParse(repairedParsed, null)
    if (parsedAgain && typeof parsedAgain === 'object') return parsedAgain
  }

  return null
}

function buildMinimalFallbackAnalysis(questionText, coreDiscoveryHint = '') {
  const text = String(questionText || '').trim()
  return {
    question_type: coreDiscoveryHint || '暂未分类',
    known_conditions: text ? [text] : [],
    hidden_conditions: [],
    verification_target: '',
    core_discovery: coreDiscoveryHint || '',
    discovery_flow: [],
    challenge_steps: [],
    interaction_flow: {
      trigger: '',
      action: '',
      feedback: [],
      reset: '',
    },
    animation_flow: {
      type: '',
      description: '',
      visual_effect: [],
      duration: '',
    },
    component_rules: {
      scene: '',
      look: '',
      control: '',
      visual: '',
      animation: '',
      challenge: '',
    },
  }
}

function stripAnalysisNoise(analysisJson) {
  const next = analysisJson && typeof analysisJson === 'object' && !Array.isArray(analysisJson)
    ? { ...analysisJson }
    : {}
  delete next.knowledge
  delete next.known_data
  return next
}

function buildTempFallbackHtml(questionText, analysisJson) {
  const analysis = analysisJson && typeof analysisJson === 'object' ? analysisJson : {}
  const normalizeList = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
    if (value == null) return []
    const text = String(value).trim()
    return text ? [text] : []
  }
  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  const questionType = String(analysis.question_type || '暂未分类')
  const coreDiscovery = String(analysis.core_discovery || questionType || '')
  const knownConditions = normalizeList(analysis.known_conditions)
  const hiddenConditions = normalizeList(analysis.hidden_conditions)
  const defaultAssets = normalizeList(analysis.default_assets)
  const challengeSteps = normalizeList(analysis.challenge_steps)
  const discoveryFlow = normalizeList(analysis.discovery_flow)
  const feedbackItems = normalizeList(analysis.interaction_flow?.feedback)
  const componentRules = analysis.component_rules && typeof analysis.component_rules === 'object' && !Array.isArray(analysis.component_rules)
    ? analysis.component_rules
    : {}
  const trigger = String(analysis.interaction_flow?.trigger || '点击开始探索')
  const action = String(analysis.interaction_flow?.action || '根据题意触发变化')
  const resetText = String(analysis.interaction_flow?.reset || '重置后回到初始状态')
  const animationType = String(analysis.animation_flow?.type || '步骤推进')
  const animationDescription = String(analysis.animation_flow?.description || '根据题意逐步展示变化过程')
  const visualEffects = normalizeList(analysis.animation_flow?.visual_effect)
  const verificationTarget = String(analysis.verification_target || '')
  const answer = analysis.answer && typeof analysis.answer === 'object'
    ? String(analysis.answer.value ?? '')
    : String(analysis.answer ?? '')
  const answerUnit = analysis.answer && typeof analysis.answer === 'object'
    ? String(analysis.answer.unit ?? '')
    : ''
  const fallbackSummary = [
    ...knownConditions.slice(0, 3),
    ...hiddenConditions.slice(0, 2),
    ...challengeSteps.slice(0, 3),
  ]
  const interactionMode = (() => {
    const source = `${trigger} ${action} ${verificationTarget} ${questionText}`.toLowerCase()
    if (/(滑块|拖动|拖拽|滑动|slider|range)/.test(source)) return 'slider'
    if (/(输入|填写|输入框|answer|填空)/.test(source)) return 'input'
    return 'button'
  })()
  const pickUnique = (items, limit = 3) => [...new Set(items.filter(Boolean))].slice(0, limit)
  const selectTempComponents = () => {
    const controlSource = [questionType, coreDiscovery, trigger, action, discoveryFlow.join(' '), componentRules.control, componentRules.challenge].join(' ')
    const visualSource = [questionType, coreDiscovery, componentRules.visual, knownConditions.join(' '), hiddenConditions.join(' '), animationDescription, visualEffects.join(' ')].join(' ')
    const animationSource = [questionType, coreDiscovery, componentRules.animation, animationDescription, visualEffects.join(' '), action].join(' ')
    const challengeSource = [questionType, coreDiscovery, componentRules.challenge, verificationTarget, challengeSteps.join(' ')].join(' ')

    const controls = []
    if (/(滑块|滑动|拖动|进度)/.test(controlSource)) controls.push('SliderControl')
    if (/(拖拽|拖入|拖到)/.test(controlSource)) controls.push('DragControl')
    if (/(点击|按钮|开始|继续|重置|下一步|加减)/.test(controlSource)) controls.push('ClickControl', 'MButton', 'StepButton')
    if (/(选择|选项)/.test(controlSource)) controls.push('ChoiceControl')

    const visuals = []
    if (/(数量|总数|剩余|花费|金额|数字|商|余数)/.test(visualSource)) visuals.push('Counter', 'Bar', 'MResult')
    if (/(硬币|分组|盒子|装入|购物车|篮子)/.test(visualSource)) visuals.push('ItemGroup', 'Box', 'DashedBox', 'SolidBox')
    if (/(平衡|比较|差额|左右)/.test(visualSource)) visuals.push('Balance', 'Arrow')
    if (/(线段|数轴|时间|天)/.test(visualSource)) visuals.push('Timeline', 'NumberLine', 'PointSegment')

    const animations = []
    if (/(跳动|增大|减少|变化|递增|递减)/.test(animationSource)) animations.push('CountUp', 'Move')
    if (/(闪烁|警告|高亮|强调|变红)/.test(animationSource)) animations.push('Glow', 'Shake', 'Highlight')
    if (/(拆分|分裂)/.test(animationSource)) animations.push('Split')
    if (/(合并|汇总)/.test(animationSource)) animations.push('Merge')
    if (/(连线|对应)/.test(animationSource)) animations.push('ConnectLine')
    if (/(消失|淡出)/.test(animationSource)) animations.push('FadeOut')
    if (/(揭示|缺口|空位)/.test(animationSource)) animations.push('RevealGap')

    const challenges = []
    if (/(输入|填写|答案|验证)/.test(challengeSource)) challenges.push('AnswerInput', 'MInput')
    if (/(提交|确认|验证)/.test(challengeSource)) challenges.push('MButton')
    if (/(正确|结果|答案)/.test(challengeSource)) challenges.push('MResult')

    return {
      controls: pickUnique(controls, 3),
      visuals: pickUnique(visuals, 4),
      animations: pickUnique(animations, 4),
      challenges: pickUnique(challenges, 3),
    }
  }
  const selectedComponents = selectTempComponents()
  const controlMode = selectedComponents.controls.includes('SliderControl')
    ? 'slider'
    : selectedComponents.controls.includes('DragControl')
      ? 'button'
      : selectedComponents.controls.includes('ChoiceControl')
        ? 'choice'
    : 'button'

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>互动演示</title>
<style>
:root{--pink:#FF0080;--purple:#7928CA;--blue:#0070F3;--bg:#FAFAFA;--card:#FFF;--ink:#171717;--body:#4D4D4D;--mute:#888;--line:#e8e8ec}
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}
body{background:var(--bg);color:var(--body);min-height:100vh;padding:16px;display:flex;justify-content:center}
.wrap{width:100%;max-width:860px;display:flex;flex-direction:column;gap:16px;padding-bottom:32px}
.card{background:var(--card);border-radius:24px;box-shadow:0 1px 3px rgba(0,0,0,.04),0 2px 8px rgba(0,0,0,.04);padding:20px;border:1px solid rgba(0,0,0,.03)}
.hero{background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff}
.title{font-size:13px;font-weight:700;letter-spacing:.5px;color:var(--mute);margin-bottom:12px}
.hero .title{color:rgba(255,255,255,.9)}
.q{font-size:15px;line-height:1.8;font-weight:600;color:var(--ink)}
.hero .q{color:#fff}
.section-title{font-size:15px;font-weight:700;color:var(--ink);margin-bottom:10px}
.chip-row{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid #ebe4ff;background:#f7f4ff;color:var(--purple);font-size:12px;line-height:1.4}
.chip.gray{background:#fff;border-color:var(--line);color:var(--body)}
.summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.summary-card{border-radius:18px;border:1px solid var(--line);background:#fff;padding:12px}
.summary-k{font-size:11px;color:var(--mute);margin-bottom:4px}
.summary-v{font-size:15px;line-height:1.5;color:var(--ink);font-weight:700}
.rule-list{display:flex;flex-direction:column;gap:8px}
.rule-card{border-radius:16px;border:1px solid var(--line);background:#fff;padding:12px}
.rule-k{font-size:11px;color:var(--mute);margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px}
.rule-v{font-size:13px;line-height:1.6;color:var(--ink)}
.relation{border-radius:18px;border:1px solid rgba(121,40,202,.14);background:linear-gradient(135deg,rgba(121,40,202,.06),rgba(255,0,128,.04));padding:12px 14px;color:var(--ink);font-size:13px;line-height:1.7}
.box{border-radius:18px;border:1px solid var(--line);background:#fff;padding:14px}
.box.soft{background:var(--bg)}
.btn-row{display:flex;flex-wrap:wrap;gap:8px}
.btn{border:none;border-radius:999px;padding:10px 14px;background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff;font-weight:700;font-size:13px;cursor:pointer}
.btn.secondary{background:#fff;color:var(--ink);border:1px solid var(--line)}
.btn.ghost{background:#f7f7f7;color:var(--body);border:1px solid #ededed}
.btn:disabled{opacity:.45;cursor:not-allowed}
.input{width:100%;border:1px solid #e7e7e7;border-radius:14px;padding:12px 14px;font-size:14px;background:#fff;color:var(--ink);outline:none}
.feedback{margin-top:10px;border-radius:14px;background:#f8f7ff;border:1px solid #ece5ff;color:var(--purple);padding:12px 14px;font-size:13px;line-height:1.7}
.feedback.good{background:#eefdf3;border-color:#caedcf;color:#15803d}
.feedback.bad{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
.stack{display:flex;flex-direction:column;gap:12px}
.stage{display:flex;flex-direction:column;gap:12px}
.stage-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:12px;color:var(--body)}
.stage-pill.active{background:#eef5ff;border-color:#cfe0ff;color:var(--blue)}
.step-list{display:flex;flex-direction:column;gap:8px}
.step{padding:10px 12px;border-radius:14px;background:#fff;border:1px solid var(--line);font-size:13px;line-height:1.6;color:var(--body)}
.core{border-radius:16px;background:#eef5ff;border:1px solid #d6e7ff;padding:12px 14px;color:var(--blue);font-size:13px;line-height:1.7}
.core.hidden{display:none}
.guide-item{padding:10px 12px;border-radius:14px;background:#fff;border:1px dashed #eadfff;font-size:13px;line-height:1.6;color:var(--body)}
.control-wrap{display:flex;flex-direction:column;gap:12px}
.control-label{font-size:13px;font-weight:700;color:var(--ink)}
.control-meta{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--mute);line-height:1.5}
.meter{border-radius:20px;background:linear-gradient(135deg,rgba(121,40,202,.08),rgba(255,0,128,.08));padding:16px;border:1px solid rgba(121,40,202,.12)}
.meter-num{font-size:28px;font-weight:800;color:var(--ink);line-height:1}
.meter-sub{font-size:12px;color:var(--body);margin-top:6px}
.slider{width:100%;accent-color:var(--blue)}
@media (max-width:760px){body{padding:12px}.card{padding:16px}.summary-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <section class="card hero">
    <div class="title">📝 题目</div>
    <div class="q">${escapeHtml(questionText)}</div>
  </section>

  <section class="card">
    <div class="section-title">1. 观察区</div>
    ${knownConditions.length ? `
    <div class="box" style="margin-bottom:12px">
      <div class="summary-grid">
        ${knownConditions.map((item, index) => `<div class="summary-card"><div class="summary-k">已知条件 ${index + 1}</div><div class="summary-v">${escapeHtml(item)}</div></div>`).join('')}
      </div>
    </div>` : ''}
    ${hiddenConditions.length ? `
    <div class="box" style="margin-bottom:12px">
      <div class="summary-grid">
        ${hiddenConditions.map((item, index) => `<div class="summary-card"><div class="summary-k">隐含条件 ${index + 1}</div><div class="summary-v">${escapeHtml(item)}</div></div>`).join('')}
      </div>
    </div>` : ''}
    <div class="box">
      <div class="relation">${escapeHtml(coreDiscovery || '先观察条件之间的数量关系')}</div>
    </div>
  </section>

  <section class="card">
    <div class="section-title">2. 发现区</div>
    <div class="stack">
      <div class="box soft">
        <div class="control-wrap">
          <div class="control-label">${escapeHtml(trigger || '点击开始探索')}</div>
          ${controlMode === 'slider' ? `
            <input id="temp-slider" class="slider" type="range" min="0" max="100" value="0" step="1">
            <div class="control-meta"><span>0%</span><span>${escapeHtml(action || '拖动查看变化')}</span><span>100%</span></div>
          ` : ''}
          <div class="btn-row">
            <button class="btn" id="temp-primary" type="button">${escapeHtml(trigger || '开始探索')}</button>
            <button class="btn ghost" id="temp-reset" type="button">重置</button>
          </div>
        </div>
        <div class="meter" style="margin-top:12px">
          <div class="meter-num" id="temp-meter">0</div>
          <div class="meter-sub" id="temp-meter-sub">${escapeHtml(animationDescription || '页面会随着操作展示变化')}</div>
        </div>
      </div>
      <div class="box">
        <div class="chip-row">
          ${feedbackItems.length ? feedbackItems.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('') : ''}
        </div>
      </div>
      <div class="box">
        <div class="step-list">
          ${discoveryFlow.length ? discoveryFlow.map((item, index) => `<div class="step">${index + 1}. ${escapeHtml(item)}</div>`).join('') : '<div class="step">1. 先观察，再互动，再验证。</div>'}
        </div>
      </div>
      <div class="box">
        <div class="guide-item">${escapeHtml(animationType)}：${escapeHtml(animationDescription)}</div>
        <div class="chip-row" style="margin-top:8px">
          ${visualEffects.length ? visualEffects.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('') : ''}
        </div>
      </div>
      <div class="relation">${escapeHtml(coreDiscovery || '先观察条件之间的数量关系')}</div>
    </div>
  </section>

  <section class="card">
    <div class="section-title">3. 挑战区</div>
    <div class="stage">
      <div class="box">
        <input id="temp-answer" class="input" type="text" placeholder="请输入答案">
        <div class="btn-row" style="margin-top:10px">
          <button class="btn" id="temp-verify" type="button">验证</button>
          <button class="btn secondary" id="temp-show" type="button">显示答案</button>
          <button class="btn ghost" id="temp-reset2" type="button">重置</button>
        </div>
        <div class="feedback" id="temp-feedback">先观察，再互动，再验证。</div>
        <div class="feedback good" id="temp-answer-box" style="display:none;margin-top:10px"></div>
      </div>
      <div class="box">
        <div class="step-list">
          ${challengeSteps.length ? challengeSteps.map((item, index) => `<div class="step">${index + 1}. ${escapeHtml(item)}</div>`).join('') : '<div class="step">1. 先观察，再计算，再验证。</div>'}
        </div>
      </div>
    </div>
  </section>
</div>
<script>
(function(){
  var slider = document.getElementById('temp-slider');
  var primary = document.getElementById('temp-primary');
  var reset = document.getElementById('temp-reset');
  var reset2 = document.getElementById('temp-reset2');
  var meter = document.getElementById('temp-meter');
  var meterSub = document.getElementById('temp-meter-sub');
  var answerInput = document.getElementById('temp-answer');
  var verify = document.getElementById('temp-verify');
  var show = document.getElementById('temp-show');
  var feedback = document.getElementById('temp-feedback');
  var answerBox = document.getElementById('temp-answer-box');
  var answerText = ${JSON.stringify(answer)};
  var answerUnit = ${JSON.stringify(answerUnit)};
  var triggerText = ${JSON.stringify(trigger)};
  var actionText = ${JSON.stringify(action)};
  var resetText = ${JSON.stringify(resetText)};
  var stage = 0;
  function setFeedback(text, tone){
    feedback.className = tone ? ('feedback ' + tone) : 'feedback';
    feedback.textContent = text;
  }
  function render(){
    if (meter) meter.textContent = slider ? String(Math.round((Number(slider.value || 0) / 100) * 100)) : String(stage + 1);
    if (meterSub) meterSub.textContent = stage >= 2 ? (${JSON.stringify(animationDescription)}) : (${JSON.stringify(coreDiscovery)});
  }
  if (slider) slider.addEventListener('input', render);
  if (primary) primary.addEventListener('click', function(){ stage = Math.min(stage + 1, 2); if (slider) slider.value = String(Math.min(100, stage * 50)); render(); });
  if (reset) reset.addEventListener('click', function(){ stage = 0; if (slider) slider.value = '0'; if (answerInput) answerInput.value = ''; if (answerBox) answerBox.style.display = 'none'; setFeedback('先观察，再互动，再验证。'); render(); });
  if (reset2) reset2.addEventListener('click', function(){ reset.click(); });
  if (verify) verify.addEventListener('click', function(){
    var value = String(answerInput && answerInput.value || '').replace(/\s+/g,'');
    var expected = String(answerText || '').replace(/\s+/g,'');
    if (!value) return setFeedback('先输入答案再验证。', 'bad');
    if (!expected || value === expected || value === expected + (answerUnit || '') || value.includes(expected)) {
      setFeedback('正确！你已经找到答案。', 'good');
      if (answerBox) {
        answerBox.style.display = 'block';
        answerBox.textContent = '答案：' + (answerText || '暂无') + (answerUnit ? (' ' + answerUnit) : '');
      }
      return;
    }
    setFeedback('还差一点，再看一眼发现区。', 'bad');
  });
  if (show) show.addEventListener('click', function(){
    if (answerBox) {
      answerBox.style.display = 'block';
      answerBox.textContent = '答案：' + (answerText || '暂无') + (answerUnit ? (' ' + answerUnit) : '');
    }
    setFeedback('标准答案已经显示。', 'good');
  });
  if (answerInput) answerInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') verify.click(); });
  render();
})();
</script>
</body>
  </html>`
}

function buildPlanDrivenHtml(questionText, analysisJson, renderPlan) {
  const analysis = analysisJson && typeof analysisJson === 'object' ? analysisJson : {}
  const plan = renderPlan && typeof renderPlan === 'object' ? renderPlan : {}
  const normalizeList = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
    if (value == null) return []
    const text = String(value).trim()
    return text ? [text] : []
  }
  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  const questionType = String(analysis.question_type || plan.coreDiscovery || '暂未分类')
  const coreDiscovery = String(analysis.core_discovery || plan.coreDiscovery || questionType)
  const knownConditions = normalizeList(analysis.known_conditions)
  const hiddenConditions = normalizeList(analysis.hidden_conditions)
  const challengeSteps = normalizeList(analysis.challenge_steps)
  const discoveryFlow = normalizeList(analysis.discovery_flow)
  const feedbackItems = normalizeList(analysis.interaction_flow?.feedback)
  const assets = normalizeList(plan.assets || analysis.default_assets)
  const controls = normalizeList(plan.controls)
  const visuals = normalizeList(plan.visuals)
  const animations = normalizeList(plan.animations)
  const observationCards = [...knownConditions, ...hiddenConditions].slice(0, 4)
  const animationType = String(analysis.animation_flow?.type || '步骤推进')
  const animationDescription = String(analysis.animation_flow?.description || '根据题意逐步展示变化过程')
  const visualEffects = normalizeList(analysis.animation_flow?.visual_effect)
  const trigger = String(analysis.interaction_flow?.trigger || '点击开始探索')
  const action = String(analysis.interaction_flow?.action || '根据题意触发变化')
  const resetText = String(analysis.interaction_flow?.reset || '重置后回到初始状态')
  const answerValue = analysis.answer && typeof analysis.answer === 'object'
    ? String(analysis.answer.value ?? '')
    : String(analysis.answer ?? '')
  const answerUnit = analysis.answer && typeof analysis.answer === 'object'
    ? String(analysis.answer.unit ?? '')
    : ''
  const expected = [answerValue, answerUnit].filter(Boolean).join('')
  const primaryControl = controls[0] || ''
  const hasSlider = controls.includes('SliderControl') || /(滑块|拖动|滑动|进度)/.test(`${trigger} ${action} ${questionType} ${coreDiscovery}`)
  const hasChoice = controls.includes('ChoiceControl') || /(选择|选项)/.test(`${trigger} ${action} ${questionType}`)
  const hasDrag = controls.includes('DragControl') || /(拖拽|拖入|拖到)/.test(`${trigger} ${action} ${questionType}`)

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(questionType)}</title>
<style>
:root{--pink:#FF0080;--purple:#7928CA;--blue:#0070F3;--bg:#FAFAFA;--card:#FFF;--ink:#171717;--body:#4D4D4D;--mute:#888;--line:#e8e8ec}
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}
body{background:var(--bg);color:var(--body);min-height:100vh;padding:12px;display:flex;justify-content:center}
.wrap{width:100%;max-width:860px;display:flex;flex-direction:column;gap:12px;padding-bottom:28px}
.card{background:var(--card);border-radius:22px;box-shadow:0 1px 3px rgba(0,0,0,.04),0 2px 8px rgba(0,0,0,.04);padding:16px;border:1px solid rgba(0,0,0,.03)}
.hero{background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff}
.title{font-size:13px;font-weight:700;letter-spacing:.5px;color:var(--mute);margin-bottom:10px}
.hero .title{color:rgba(255,255,255,.9)}
.q{font-size:16px;line-height:1.75;font-weight:700;color:#fff}
.section-title{font-size:15px;font-weight:700;color:var(--ink);margin-bottom:10px}
.stack{display:flex;flex-direction:column;gap:12px}
.summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.summary-card{border-radius:16px;border:1px solid var(--line);background:#fff;padding:12px}
.summary-k{font-size:11px;color:var(--mute);margin-bottom:4px}
.summary-v{font-size:15px;line-height:1.5;color:var(--ink);font-weight:700}
.chip-row{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid #ebe4ff;background:#f7f4ff;color:var(--purple);font-size:12px;line-height:1.4}
.box{border-radius:18px;border:1px solid var(--line);background:#fff;padding:14px}
.box.soft{background:var(--bg)}
.step-list{display:flex;flex-direction:column;gap:8px}
.step{padding:10px 12px;border-radius:14px;background:#fff;border:1px solid var(--line);font-size:13px;line-height:1.6;color:var(--body)}
.btn-row{display:flex;flex-wrap:wrap;gap:8px}
.btn{border:none;border-radius:999px;padding:10px 14px;background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff;font-weight:700;font-size:13px;cursor:pointer}
.btn.secondary{background:#fff;color:var(--ink);border:1px solid var(--line)}
.btn.ghost{background:#f7f7f7;color:var(--body);border:1px solid #ededed}
.btn:disabled{opacity:.45;cursor:not-allowed}
.input{width:100%;border:1px solid #e7e7e7;border-radius:14px;padding:12px 14px;font-size:14px;background:#fff;color:var(--ink);outline:none}
.feedback{margin-top:10px;border-radius:14px;background:#f8f7ff;border:1px solid #ece5ff;color:var(--purple);padding:12px 14px;font-size:13px;line-height:1.7}
.feedback.good{background:#eefdf3;border-color:#caedcf;color:#15803d}
.feedback.bad{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
.control-label{font-size:13px;font-weight:700;color:var(--ink);margin-bottom:10px}
.control-meta{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--mute);line-height:1.5}
.meter{border-radius:20px;background:linear-gradient(135deg,rgba(121,40,202,.08),rgba(255,0,128,.08));padding:16px;border:1px solid rgba(121,40,202,.12)}
.meter-num{font-size:28px;font-weight:800;color:var(--ink);line-height:1}
.meter-sub{font-size:12px;color:var(--body);margin-top:6px}
.slider{width:100%;accent-color:var(--blue)}
.visual-card{border-radius:18px;border:1px solid var(--line);background:#fff;padding:14px}
.visual-title{font-size:12px;color:var(--mute);margin-bottom:8px}
.visual-value{font-size:20px;font-weight:800;color:var(--ink)}
.visual-bar{height:12px;border-radius:999px;background:#ece8f6;overflow:hidden}
.visual-bar > div{height:100%;border-radius:999px;background:linear-gradient(135deg,var(--purple),var(--pink));transition:width .3s ease}
.visual-line{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;color:var(--body);font-size:12px}
@media (max-width:760px){body{padding:10px}.card{padding:14px}.summary-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <section class="card hero">
    <div class="title">📝 题目</div>
    <div class="q">${escapeHtml(questionText)}</div>
  </section>

  <section class="card">
    <div class="section-title">1. 观察区</div>
    <div class="stack">
      ${knownConditions.length ? `<div class="summary-grid">${knownConditions.map((item, index) => `<div class="summary-card"><div class="summary-k">已知条件 ${index + 1}</div><div class="summary-v">${escapeHtml(item)}</div></div>`).join('')}</div>` : ''}
      ${hiddenConditions.length ? `<div class="summary-grid">${hiddenConditions.map((item, index) => `<div class="summary-card"><div class="summary-k">隐含条件 ${index + 1}</div><div class="summary-v">${escapeHtml(item)}</div></div>`).join('')}</div>` : ''}
      ${assets.length ? `<div class="chip-row">${assets.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>` : ''}
      <div class="box">
        <div class="summary-v">${escapeHtml(coreDiscovery || '先观察条件之间的数量关系')}</div>
      </div>
    </div>
  </section>

  <section class="card">
    <div class="section-title">2. 发现区</div>
    <div class="stack">
      <div class="box soft">
        <div class="control-label">${escapeHtml(trigger)}</div>
        ${hasSlider ? `<input id="plan-slider" class="slider" type="range" min="0" max="100" value="0" step="1"><div class="control-meta"><span>0%</span><span>${escapeHtml(action)}</span><span>100%</span></div>` : ''}
        ${hasChoice ? `<div class="btn-row" style="margin-top:10px"><button class="btn secondary" data-choice="0" type="button">选项 A</button><button class="btn secondary" data-choice="1" type="button">选项 B</button><button class="btn secondary" data-choice="2" type="button">选项 C</button></div>` : ''}
        ${hasDrag ? `<div class="btn-row" style="margin-top:10px"><button class="btn secondary" id="drag-act" type="button">拖动探索</button><button class="btn ghost" id="drag-reset" type="button">重置拖动</button></div>` : ''}
        <div class="btn-row" style="margin-top:10px"><button class="btn" id="primary-act" type="button">${escapeHtml(primaryControl || '开始探索')}</button><button class="btn ghost" id="plan-reset" type="button">${escapeHtml(resetText)}</button></div>
        <div class="meter" style="margin-top:12px"><div class="meter-num" id="plan-meter">0</div><div class="meter-sub" id="plan-meter-sub">${escapeHtml(animationDescription)}</div></div>
      </div>
      <div class="visual-card">
        <div class="visual-title">变化展示</div>
        ${visuals.includes('Counter') || visuals.length === 0 ? `<div class="visual-value" id="plan-counter">0</div>` : ''}
        ${visuals.includes('Bar') || visuals.includes('MProgress') || visuals.length === 0 ? `<div class="visual-bar" style="margin-top:10px"><div id="plan-bar" style="width:0%"></div></div>` : ''}
        ${visuals.includes('NumberLine') || visuals.includes('Timeline') ? `<div class="visual-line"><span>起点</span><span>→</span><span>终点</span></div>` : ''}
        ${visuals.includes('ItemGroup') ? `<div class="chip-row" style="margin-top:10px">${Array.from({ length: 6 }).map(() => '<span class="chip">🪙</span>').join('')}</div>` : ''}
        <div class="chip-row" style="margin-top:10px">${feedbackItems.length ? feedbackItems.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('') : ''}</div>
      </div>
      <div class="visual-card">
        <div class="visual-title">动画说明</div>
        <div class="summary-v">${escapeHtml(animationType)}：${escapeHtml(animationDescription)}</div>
        <div class="chip-row" style="margin-top:10px">${visualEffects.length ? visualEffects.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('') : ''}</div>
        <div class="chip-row" style="margin-top:10px">${animations.length ? animations.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('') : ''}</div>
      </div>
      <div class="box">
        <div class="step-list">
          ${discoveryFlow.length ? discoveryFlow.map((item, index) => `<div class="step">${index + 1}. ${escapeHtml(item)}</div>`).join('') : '<div class="step">1. 先观察，再互动，再验证。</div>'}
        </div>
      </div>
      <div class="box">
        <div class="summary-v">${escapeHtml(coreDiscovery)}</div>
      </div>
    </div>
  </section>

  <section class="card">
    <div class="section-title">3. 挑战区</div>
    <div class="stack">
      <div class="box">
        <div class="step-list">
          ${challengeSteps.length ? challengeSteps.map((item, index) => `<div class="step">${index + 1}. ${escapeHtml(item)}</div>`).join('') : '<div class="step">1. 先观察，再计算，再验证。</div>'}
        </div>
      </div>
      <div class="box">
        <input id="plan-answer" class="input" type="text" placeholder="请输入答案">
        <div class="btn-row" style="margin-top:10px"><button class="btn" id="plan-verify" type="button">验证</button><button class="btn secondary" id="plan-show" type="button">显示答案</button><button class="btn ghost" id="plan-reset2" type="button">重置</button></div>
        <div class="feedback" id="plan-feedback">先观察，再互动，再验证。</div>
        <div class="feedback good" id="plan-answer-box" style="display:none;margin-top:10px"></div>
      </div>
    </div>
  </section>
</div>
<script>
(function(){
  var slider = document.getElementById('plan-slider');
  var primaryAct = document.getElementById('primary-act');
  var planReset = document.getElementById('plan-reset');
  var planReset2 = document.getElementById('plan-reset2');
  var planMeter = document.getElementById('plan-meter');
  var planMeterSub = document.getElementById('plan-meter-sub');
  var planCounter = document.getElementById('plan-counter');
  var planBar = document.getElementById('plan-bar');
  var answerInput = document.getElementById('plan-answer');
  var planVerify = document.getElementById('plan-verify');
  var planShow = document.getElementById('plan-show');
  var planFeedback = document.getElementById('plan-feedback');
  var planAnswerBox = document.getElementById('plan-answer-box');
  var choiceButtons = Array.from(document.querySelectorAll('[data-choice]'));
  var dragAct = document.getElementById('drag-act');
  var dragReset = document.getElementById('drag-reset');
  var expected = ${JSON.stringify(expected)};
  var animationDescription = ${JSON.stringify(animationDescription)};
  var coreDiscovery = ${JSON.stringify(coreDiscovery)};
  var stage = 0;
  var choiceIndex = 0;
  function setFeedback(text, tone){
    planFeedback.className = tone ? ('feedback ' + tone) : 'feedback';
    planFeedback.textContent = text;
  }
  function render(){
    var value = slider ? Number(slider.value || 0) : stage * 33;
    if (planMeter) planMeter.textContent = String(Math.round(value));
    if (planMeterSub) planMeterSub.textContent = stage >= 2 ? animationDescription : coreDiscovery;
    if (planCounter) planCounter.textContent = String(Math.round(value));
    if (planBar) planBar.style.width = Math.min(100, value) + '%';
  }
  if (slider) slider.addEventListener('input', render);
  if (primaryAct) primaryAct.addEventListener('click', function(){ stage = Math.min(stage + 1, 3); if (slider) slider.value = String(Math.min(100, stage * 33)); render(); });
  if (planReset) planReset.addEventListener('click', function(){ stage = 0; if (slider) slider.value = '0'; if (answerInput) answerInput.value = ''; if (planAnswerBox) planAnswerBox.style.display = 'none'; setFeedback('先观察，再互动，再验证。'); render(); });
  if (planReset2) planReset2.addEventListener('click', function(){ if (planReset) planReset.click(); });
  if (dragAct) dragAct.addEventListener('click', function(){ stage = Math.min(stage + 1, 3); if (slider) slider.value = String(Math.min(100, stage * 33)); render(); });
  if (dragReset) dragReset.addEventListener('click', function(){ if (planReset) planReset.click(); });
  choiceButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      choiceIndex = Number(btn.getAttribute('data-choice') || '0');
      stage = Math.min(choiceIndex + 1, 3);
      if (slider) slider.value = String(Math.min(100, stage * 33));
      render();
    });
  });
  if (planVerify) planVerify.addEventListener('click', function(){
    var value = String(answerInput && answerInput.value || '').replace(/\s+/g,'');
    var expectedValue = String(expected || '').replace(/\s+/g,'');
    if (!value) return setFeedback('先输入答案再验证。', 'bad');
    if (!expectedValue || value === expectedValue || value.includes(expectedValue)) {
      setFeedback('正确！你已经找到答案。', 'good');
      if (planAnswerBox) {
        planAnswerBox.style.display = 'block';
        planAnswerBox.textContent = '答案：' + (expectedValue || '暂无');
      }
      return;
    }
    setFeedback('还差一点，再看一眼发现区。', 'bad');
  });
  if (planShow) planShow.addEventListener('click', function(){
    if (planAnswerBox) {
      planAnswerBox.style.display = 'block';
      planAnswerBox.textContent = '答案：' + (expected || '暂无');
    }
    setFeedback('标准答案已经显示。', 'good');
  });
  if (answerInput) answerInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') planVerify.click(); });
  render();
})();
</script>
</body>
</html>`;
}

function asStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = safeJsonParse(trimmed, null)
      if (Array.isArray(parsed)) return parsed.map((item) => String(item || '').trim()).filter(Boolean)
      if (parsed && typeof parsed === 'object') return Object.values(parsed).map((item) => String(item || '').trim()).filter(Boolean)
    }
    return trimmed
      .split(/[,，\n；;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (value && typeof value === 'object') {
    return Object.values(value).map((item) => String(item || '').trim()).filter(Boolean)
  }
  return []
}

function pickFirstString(...values) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

function normalizeComponentList(value) {
  return asStringArray(value).map(normalizeTypeName)
}

function normalizeComponentRules(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  const parsed = safeJsonParse(value, {})
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}

function normalizeQuestionTypeRow(row) {
  return {
    id: row?.id,
    name: row?.name || '',
    coreDiscovery: row?.core_discovery || '',
    discoveryFlow: row?.discovery_flow || '',
    interactionFlow: row?.interaction_flow || '',
    animationFlow: row?.animation_flow || '',
    analysisPrompt: row?.analysis_prompt || '',
    htmlPrompt: row?.html_prompt || '',
    layoutComponent: row?.layout_component || '',
    lookComponent: row?.look_component || '',
    controlComponent: row?.control_component || '',
    visualComponent: row?.visual_component || '',
    animationComponent: row?.animation_component || '',
    challengeComponent: row?.challenge_component || '',
    defaultAssets: safeJsonParse(row?.default_assets, []),
    pageSchemaVersion: Number(row?.page_schema_version || 1),
    fallbackStrategy: safeJsonParse(row?.fallback_strategy, {}),
    createdAt: row?.created_at || '',
    updatedAt: row?.updated_at || '',
  }
}

const KNOWN_COMPONENT_LIBRARY = {
  scene: new Set(['ThreeZoneLayout']),
  observation: new Set(['MTitle', 'MHint', 'MCard', 'MProgress', 'Counter', 'ItemIcon', 'ItemGroup', 'Box', 'DashedBox', 'SolidBox', 'Arrow', 'Balance', 'Bar', 'Timeline', 'NumberLine', 'PointSegment', 'PersonIcon', 'BoxIcon', 'CupIcon', 'TreeIcon', 'CherryIcon', 'AppleIcon', 'RoadIcon', 'CoinIcon', 'MachineIcon', 'AnimalIcon']),
  discovery: new Set(['ClickControl', 'DragControl', 'SliderControl', 'StepButton', 'ChoiceControl', 'MButton', 'MCard', 'MProgress', 'MResult', 'Counter', 'ItemGroup', 'Box', 'DashedBox', 'SolidBox', 'Arrow', 'Balance', 'Bar', 'Timeline', 'NumberLine', 'PointSegment', 'Highlight', 'Move', 'Split', 'Merge', 'FadeOut', 'CountUp', 'Shake', 'Glow', 'ConnectLine', 'RevealGap']),
  challenge: new Set(['AnswerInput', 'MInput', 'MResult', 'MProgress', 'StepButton', 'ChoiceControl', 'MButton', 'CountUp', 'Glow', 'Shake', 'RevealGap']),
  // Legacy buckets kept for compatibility with older render plans and logs.
  layout: new Set(['SceneFrame', 'TwoColumnLayout', 'SingleColumnLayout', 'ThreeZoneLayout', 'StickyAsideLayout']),
  control: new Set(['ClickControl', 'DragControl', 'SliderControl', 'StepButton', 'ChoiceControl', 'AnswerInput']),
  visual: new Set(['ItemIcon', 'ItemGroup', 'Counter', 'Box', 'DashedBox', 'SolidBox', 'Arrow', 'Balance', 'Bar', 'Timeline', 'NumberLine', 'PointSegment']),
  asset: new Set(['PersonIcon', 'BoxIcon', 'CupIcon', 'TreeIcon', 'CherryIcon', 'AppleIcon', 'RoadIcon', 'CoinIcon', 'MachineIcon', 'AnimalIcon']),
  animation: new Set(['Highlight', 'Move', 'Split', 'Merge', 'FadeOut', 'CountUp', 'Shake', 'Glow', 'ConnectLine', 'RevealGap']),
}

function inferLayoutFromAnalysis(analysisJson, typeContext) {
  const hint = typeContext.layoutComponent
  return hint ? String(hint) : ''
}

function inferObservationComponents(analysisJson, typeContext) {
  const candidates = [...normalizeComponentList(typeContext.lookComponent)]
  if (candidates.length > 0) return [...new Set(candidates)]
  return []
}

function inferDiscoveryControlComponents(analysisJson, typeContext) {
  const candidates = [
    ...normalizeComponentList(typeContext.controlComponent),
  ]
  if (candidates.length > 0) return [...new Set(candidates)]
  return []
}

function inferDiscoveryVisualComponents(analysisJson, typeContext) {
  const candidates = [
    ...normalizeComponentList(typeContext.visualComponent),
  ]
  if (candidates.length > 0) return [...new Set(candidates)]

  return []
}

function inferDiscoveryAnimationComponents(analysisJson, typeContext) {
  const candidates = [
    ...normalizeComponentList(typeContext.animationComponent),
  ]
  if (candidates.length > 0) return [...new Set(candidates)]
  return []
}

function inferChallengeComponents(analysisJson, typeContext) {
  const candidates = [
    ...normalizeComponentList(typeContext.challengeComponent),
  ]
  if (candidates.length > 0) return [...new Set(candidates)]

  if (analysisJson?.answer || analysisJson?.verification_target) return ['AnswerInput', 'MResult']
  if (analysisJson?.challenge_steps?.length) return ['AnswerInput']
  return []
}

function inferDefaultAssets(typeContext, analysisJson) {
  const assets = Array.isArray(typeContext.defaultAssets) ? typeContext.defaultAssets : []
  if (assets.length > 0) return assets
  return []
}

function buildRenderPlan(typeContext, analysisJson, questionText) {
  const componentRules = normalizeComponentRules(analysisJson?.component_rules)
  const fallbackStrategy = safeJsonParse(typeContext.fallbackStrategy, {})
  const missingComponents = []

  const layoutName = pickFirstString(typeContext.layoutComponent, inferLayoutFromAnalysis(analysisJson, typeContext))
  if (layoutName && !KNOWN_COMPONENT_LIBRARY.scene.has(layoutName) && !KNOWN_COMPONENT_LIBRARY.layout.has(layoutName)) {
    missingComponents.push({
      category: 'scene',
      name: layoutName,
      reason: typeContext.layoutComponent
        ? `question_types.layout_component=${typeContext.layoutComponent} 不在三段式布局组件库`
        : '未配置 layout_component，当前布局来自分析结果',
    })
  }

  const observationComponents = inferObservationComponents(analysisJson, typeContext)
  observationComponents.forEach((name) => {
    if (!KNOWN_COMPONENT_LIBRARY.observation.has(name) && !KNOWN_COMPONENT_LIBRARY.visual.has(name)) {
      missingComponents.push({
        category: 'observation',
        name,
        reason: '观察区组件不在已知组件库中',
      })
    }
  })

  const discoveryControlComponents = inferDiscoveryControlComponents(analysisJson, typeContext)
  discoveryControlComponents.forEach((name) => {
    if (!KNOWN_COMPONENT_LIBRARY.discovery.has(name) && !KNOWN_COMPONENT_LIBRARY.control.has(name)) {
      missingComponents.push({
        category: 'discovery_control',
        name,
        reason: '发现区操作类组件不在已知组件库中',
      })
    }
  })

  const discoveryVisualComponents = inferDiscoveryVisualComponents(analysisJson, typeContext)
  discoveryVisualComponents.forEach((name) => {
    if (!KNOWN_COMPONENT_LIBRARY.discovery.has(name) && !KNOWN_COMPONENT_LIBRARY.visual.has(name)) {
      missingComponents.push({
        category: 'discovery_visual',
        name,
        reason: '发现区展示类组件不在已知组件库中',
      })
    }
  })

  const discoveryAnimationComponents = inferDiscoveryAnimationComponents(analysisJson, typeContext)
  discoveryAnimationComponents.forEach((name) => {
    if (!KNOWN_COMPONENT_LIBRARY.discovery.has(name) && !KNOWN_COMPONENT_LIBRARY.animation.has(name)) {
      missingComponents.push({
        category: 'discovery_animation',
        name,
        reason: '发现区动画类组件不在已知组件库中',
      })
    }
  })

  const challengeComponents = inferChallengeComponents(analysisJson, typeContext)
  challengeComponents.forEach((name) => {
    if (!KNOWN_COMPONENT_LIBRARY.challenge.has(name) && !KNOWN_COMPONENT_LIBRARY.control.has(name) && !KNOWN_COMPONENT_LIBRARY.animation.has(name)) {
      missingComponents.push({
        category: 'challenge',
        name,
        reason: '挑战区组件不在已知组件库中',
      })
    }
  })

  const defaultAssets = inferDefaultAssets(typeContext, analysisJson)
  defaultAssets.forEach((asset) => {
    const assetName = String(asset?.name || asset?.label || asset || '').trim()
    if (!assetName) return
    if (/Icon$/.test(assetName) && !KNOWN_COMPONENT_LIBRARY.asset.has(assetName)) {
      missingComponents.push({
        category: 'asset',
        name: assetName,
        reason: '素材组件不在已知素材库中',
      })
    }
  })

  const fallbackUsed = missingComponents.length > 0

  return {
    version: typeContext.pageSchemaVersion || 1,
    questionText,
    coreDiscovery: typeContext.coreDiscovery || '',
    layout: {
      name: layoutName,
      source: typeContext.layoutComponent ? 'question_types.layout_component' : 'inferred',
    },
    scene: layoutName ? [layoutName] : [],
    observations: observationComponents,
    discoveries: [...new Set([
      ...discoveryControlComponents,
      ...discoveryVisualComponents,
      ...discoveryAnimationComponents,
    ])],
    challenges: challengeComponents,
    controls: discoveryControlComponents,
    visuals: discoveryVisualComponents,
    animations: discoveryAnimationComponents,
    assets: defaultAssets,
    rules: componentRules,
    fallbackStrategy,
    matchedComponents: {
      scene: [layoutName].filter(Boolean),
      observations: observationComponents,
      discoveries: [...new Set([
        ...discoveryControlComponents,
        ...discoveryVisualComponents,
        ...discoveryAnimationComponents,
      ])],
      challenges: challengeComponents,
      layout: layoutName ? [layoutName] : [],
      controls: discoveryControlComponents,
      visuals: discoveryVisualComponents,
      animations: discoveryAnimationComponents,
      assets: defaultAssets,
    },
    missingComponents,
    fallbackUsed,
  }
}

function buildTypeContextSummary(typeContext) {
  return [
    `core_discovery：${typeContext.coreDiscovery || ''}`,
    `name：${typeContext.name || ''}`,
    typeContext.layoutComponent ? `layout_component：${typeContext.layoutComponent}` : '',
    typeContext.lookComponent ? `look_component：${typeContext.lookComponent}` : '',
    typeContext.controlComponent ? `control_component：${typeContext.controlComponent}` : '',
    typeContext.visualComponent ? `visual_component：${typeContext.visualComponent}` : '',
    typeContext.animationComponent ? `animation_component：${typeContext.animationComponent}` : '',
    typeContext.challengeComponent ? `challenge_component：${typeContext.challengeComponent}` : '',
    typeContext.discoveryFlow ? `discovery_flow：${typeContext.discoveryFlow}` : '',
    typeContext.interactionFlow ? `interaction_flow：${typeContext.interactionFlow}` : '',
    typeContext.animationFlow ? `animation_flow：${typeContext.animationFlow}` : '',
    typeContext.analysisPrompt ? `analysis_prompt：${typeContext.analysisPrompt}` : '',
    typeContext.htmlPrompt ? `html_prompt：${typeContext.htmlPrompt}` : '',
    typeContext.fallbackStrategy ? `fallback_strategy：${JSON.stringify(typeContext.fallbackStrategy)}` : '',
  ].filter(Boolean).join('\n')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderListItems(items, fallbackText = '暂无') {
  const list = Array.isArray(items) ? items : []
  if (list.length === 0) {
    return `<div class="empty">${escapeHtml(fallbackText)}</div>`
  }
  return list.map((item, index) => `<li><span class="idx">${index + 1}</span><span>${escapeHtml(item)}</span></li>`).join('')
}

async function postJsonRow(url, headers, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`POST ${url} failed: ${r.status} ${text}`)
  }
  return r.json()
}

async function recordGenerationArtifacts({ headers, supabaseUrl, runId, questionId, typeContext, analysisJson, renderPlan, status }) {
  try {
    await postJsonRow(`${supabaseUrl}/rest/v1/generation_runs`, headers, {
      id: runId,
      user_question_id: questionId,
      core_discovery: typeContext?.coreDiscovery || '',
      layout_key: renderPlan?.layout?.name || typeContext?.layoutComponent || '',
      matched_components: renderPlan?.matchedComponents || {},
      missing_components: renderPlan?.missingComponents || [],
      missing_capabilities: renderPlan?.missingCapabilities || [],
      fallback_used: !!renderPlan?.fallbackUsed,
      status,
      analysis_json: analysisJson || {},
      render_json: renderPlan || {},
    })
  } catch (e) {
    console.warn('[generate/demo] recordGenerationArtifacts(run) failed', e.message)
  }

  const gaps = [
    ...(renderPlan?.missingComponents || []).map((gap) => ({
      gap_type:
        gap.category === 'scene'
          ? 'layout'
          : gap.category === 'observation'
            ? 'visual'
            : gap.category === 'discovery'
              ? 'control'
              : gap.category === 'challenge'
                ? 'control'
                : (gap.category || 'component'),
      gap_name: gap.name || '',
      gap_reason: gap.reason || '',
    })),
    ...(renderPlan?.missingCapabilities || []).map((gap) => ({
      gap_type:
        gap.category === 'scene'
          ? 'layout'
          : gap.category === 'observation'
            ? 'visual'
            : gap.category === 'discovery'
              ? 'control'
              : gap.category === 'challenge'
                ? 'control'
                : (gap.category || 'capability'),
      gap_name: gap.name || '',
      gap_reason: gap.reason || '',
    })),
  ].filter((gap) => gap.gap_name)

  for (const gap of gaps) {
    try {
      await postJsonRow(`${supabaseUrl}/rest/v1/component_gap_logs`, headers, {
        generation_run_id: runId,
        user_question_id: questionId,
        core_discovery: typeContext?.coreDiscovery || '',
        layout_key: renderPlan?.layout?.name || typeContext?.layoutComponent || '',
        gap_type: gap.gap_type,
        gap_name: gap.gap_name,
        gap_reason: gap.gap_reason,
        severity: 3,
        fallback_used: !!renderPlan?.fallbackUsed,
        review_status: 'new',
      })
    } catch (e) {
      console.warn('[generate/demo] recordGenerationArtifacts(gap) failed', e.message)
    }
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase not configured' })
  }

  const { questionText, questionId, regenerate } = req.body
  const isNewSubmit = !!questionText && !questionId
  const isRegenerate = !!questionId && !!regenerate

  if (!isNewSubmit && !isRegenerate && !questionId) {
    return res.status(400).json({ success: false, error: 'questionText 或 questionId 是必需的' })
  }

  // ─── Supabase 服务端请求头（带 service_role 权限） ───
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    Prefer: 'return=representation',
  }

  // ─── 辅助：完整 PATCH（非 best effort，会抛错） ───
  async function patchQuestionFull(id, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/user_questions?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`PATCH user_questions 失败: ${r.status}`)
  }

  let actualQuestionId = questionId
  let questionTextStr = questionText || ''

  // ============================================================
  // try 主流程
  // ============================================================
  try {
    // ════════════════════════════════════════════════════════════
    // Step 0: 验证是否为数学题（仅新提交）
    // ════════════════════════════════════════════════════════════
    if (isNewSubmit) {
      const mathHint = looksLikeMathQuestion(questionText)

      let isMathQuestion = mathHint
      if (!isMathQuestion) {
        const mathCheck = await callAI({
          prompt: `请判断下面这道题是不是数学题。只要是需要进行数量计算、比较、单位换算、平均分、倍数、路程、时间、工程、图形、规律、统计、应用题的，都算数学题。即使题目是文字题、应用题，没有算式，也仍然算数学题。

请只回答「是」或「否」，不要任何其他文字。

示例：
1. 一道应用题："如果每天铺60米，15天完成任务，如果要求12天完工，那么平均每天要铺多少米？" -> 是
2. 一道换算题："3米等于多少厘米？" -> 是
3. 一道纯语文题："请把这段话改写得更生动" -> 否

内容：${questionText}`,
          temperature: 0,
          maxTokens: 200,
          timeoutSeconds: 15,
        })

        if (!mathCheck.success) {
          return res.status(200).json({
            success: false,
            error: `AI 验证失败: ${mathCheck.error}`,
            notMath: false,
          })
        }

        isMathQuestion = mathCheck.content.trim() === '是'
      }

      if (!isMathQuestion) {
        return res.status(200).json({
          success: false,
          error: '请输入正确的内容',
          notMath: true,
        })
      }

      // ── 是数学题 → 保存到 user_questions ──
      const userId = getUserIdFromToken(req)
      if (!userId) {
        return res.status(401).json({ success: false, error: '未登录' })
      }

      questionTextStr = questionText
      const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/user_questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question_text: questionText, user_id: userId }),
      })
      if (!saveRes.ok) throw new Error(`保存题目失败: ${saveRes.status}`)
      const savedRows = await saveRes.json()
      actualQuestionId = savedRows?.[0]?.id
      if (!actualQuestionId) throw new Error('保存题目失败：未返回 ID')
    }

    // ════════════════════════════════════════════════════════════
    // Step 1: 加载用户题目（重新生成流程从此进入）
    // ════════════════════════════════════════════════════════════
    const qRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_questions?id=eq.${actualQuestionId}`,
      { headers: { ...headers, Prefer: undefined } }
    )
    if (!qRes.ok) throw new Error(`加载题目失败: ${qRes.status}`)
    const qRows = await qRes.json()
    const question = qRows?.[0]
    if (!question) throw new Error('题目不存在')

    let questionTypeId = question.question_type_id
    let questionTypeName = question.question_type || ''
    let questionCoreDiscovery = question.core_discovery || ''
    let analysisJson = question.analysis_json || {}
    let htmlTemplate = ''
    let htmlContent = ''
    let typeContext = null
    let renderPlan = null
    let isTempFallback = false
    const generationRunId = crypto.randomUUID()

    if (questionTypeId) {
      const typeRes = await fetch(
        `${SUPABASE_URL}/rest/v1/question_types?id=eq.${questionTypeId}`,
        { headers: { ...headers, Prefer: undefined } }
      )
      if (typeRes.ok) {
        const typeRows = await typeRes.json()
        typeContext = normalizeQuestionTypeRow(typeRows?.[0] || {})
        questionTypeName = typeContext.name || questionTypeName
        questionCoreDiscovery = typeContext.coreDiscovery || questionCoreDiscovery
        htmlTemplate = typeContext.htmlPrompt || ''
      }
    }

    // ════════════════════════════════════════════════════════════
    // Step 2: AI 识别题型
    //
    // 已有题型数据 → 跳过识别和分析（regenerate 也直接复用）
    //   因为 Vercel Hobby 10s 限制，最多只够跑 1 次 AI 调用
    // ════════════════════════════════════════════════════════════
    if (!questionTypeId) {
      // 加载题型字典
      const typesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/question_types?order=id.asc`,
        { headers: { ...headers, Prefer: undefined } }
      )
      if (!typesRes.ok) throw new Error('加载题型失败')
      const allTypes = await typesRes.json()

      // ── Step 2: AI 识别题型 ──
      const typeSelectionPrompt = buildTypeSelectionPrompt(allTypes)
        const identifyResult = await callAI({
          prompt: `判断下面这道题最匹配哪个 core_discovery。\n\n可用配置：\n${typeSelectionPrompt}\n\n题目：${question.question_text}\n\n规则（严格遵循）：\n1. 如果匹配某一条配置 → 只返回该条配置的 core_discovery\n2. 如果不属于以上任何配置 → 只返回「不匹配」\n\n只返回一个词，不要任何其他文字。`,
          temperature: 0,
          maxTokens: 200,
          timeoutSeconds: 15,
        })
      if (!identifyResult.success) {
        await patchQuestionFull(actualQuestionId, { status: 'pending' })
        await recordGenerationArtifacts({
          headers,
          supabaseUrl: SUPABASE_URL,
          runId: generationRunId,
          questionId: actualQuestionId,
          typeContext: normalizeQuestionTypeRow({
            name: 'unmatched',
            core_discovery: '',
            layout_component: '',
            look_component: '',
            control_component: '',
            visual_component: '',
            animation_component: '',
            challenge_component: '',
            default_assets: [],
            page_schema_version: 1,
            component_rules: {},
            fallback_strategy: {},
          }),
          analysisJson: {},
          renderPlan: {
            version: 1,
            questionText: question.question_text,
            coreDiscovery: '',
            layout: { name: '', source: 'identify_failed' },
            controls: [],
            visuals: [],
            animations: [],
            assets: [],
            rules: {},
            fallbackStrategy: {},
            matchedComponents: { layout: [], controls: [], visuals: [], animations: [], assets: [] },
            missingComponents: [],
            fallbackUsed: false,
          },
          status: 'failed',
        })
        return res.status(200).json({
          success: false,
          error: `AI 识别失败: ${identifyResult.error}`,
          questionId: actualQuestionId,
        })
      }

      const rawIdentifiedTypeName = identifyResult.content.trim()
      questionTypeName = normalizeTypeName(rawIdentifiedTypeName)
      const matchResult = findMatchedTypeByCoreDiscoveryOrName(allTypes, rawIdentifiedTypeName)
      const matchedType = matchResult.type
      const resolvedCoreDiscovery = matchedType?.core_discovery || rawIdentifiedTypeName
      questionCoreDiscovery = resolvedCoreDiscovery
      await patchQuestionFull(actualQuestionId, {
        core_discovery: resolvedCoreDiscovery,
        status: 'pending',
      })

      if (!matchedType) {
        if (questionTypeName === '不匹配') {
          await patchQuestionFull(actualQuestionId, { status: 'pending' })
          logTypeMatchIssue('question type explicitly unmatched', {
            questionId: actualQuestionId,
            rawCoreDiscovery: rawIdentifiedTypeName,
            normalizedCoreDiscovery: questionTypeName,
            availableCoreDiscoveries: getCoreDiscoveries(allTypes),
          })
        } else {
          logTypeMatchIssue('question type not matched after normalization', {
            questionId: actualQuestionId,
            rawCoreDiscovery: rawIdentifiedTypeName,
            normalizedCoreDiscovery: questionTypeName,
            availableCoreDiscoveries: getCoreDiscoveries(allTypes),
          })
        }

        // 没有匹配到题型 → 查询 configs 表 key='temp' 的值作为兜底
        let fallbackPrompt = ''
        try {
          const cfgRes = await fetch(
            `${SUPABASE_URL}/rest/v1/configs?key=eq.temp`,
            { headers: { ...headers, Prefer: undefined } }
          )
          if (cfgRes.ok) {
            const cfgs = await cfgRes.json()
            fallbackPrompt = cfgs?.[0]?.value || ''
          }
        } catch { /* best effort */ }

        if (!fallbackPrompt) {
          await patchQuestionFull(actualQuestionId, { status: 'pending' })
          await recordGenerationArtifacts({
            headers,
            supabaseUrl: SUPABASE_URL,
            runId: generationRunId,
            questionId: actualQuestionId,
            typeContext: normalizeQuestionTypeRow({
              name: 'unmatched',
              core_discovery: questionCoreDiscovery || questionTypeName || '',
              layout_component: '',
              look_component: '',
              control_component: '',
              visual_component: '',
              animation_component: '',
              challenge_component: '',
              default_assets: [],
              page_schema_version: 1,
              component_rules: {},
              fallback_strategy: {},
            }),
            analysisJson: {},
            renderPlan: {
              version: 1,
              questionText: question.question_text,
              coreDiscovery: questionCoreDiscovery || questionTypeName || '',
              layout: { name: '', source: 'no_temp_prompt' },
              controls: [],
              visuals: [],
              animations: [],
              assets: [],
              rules: {},
              fallbackStrategy: {},
              matchedComponents: { layout: [], controls: [], visuals: [], animations: [], assets: [] },
              missingComponents: [],
              fallbackUsed: false,
            },
            status: 'failed',
          })
          return res.status(200).json({
            success: false,
            error: questionTypeName === '不匹配'
              ? '题型识别结果为“不匹配”，请确认题目描述是否符合现有题型'
              : '没有匹配到合适的题型，请尝试调整题目描述后重试',
            questionId: actualQuestionId,
          })
        }

        const fallbackTypeContext = normalizeQuestionTypeRow({
          name: '',
          core_discovery: questionCoreDiscovery || questionTypeName || '暂未分类',
          layout_component: '',
          look_component: '',
          control_component: '',
          visual_component: '',
          animation_component: '',
          challenge_component: '',
          default_assets: [],
          page_schema_version: 1,
          component_rules: {},
          fallback_strategy: { html: 'configs.temp' },
        })
        typeContext = fallbackTypeContext
        htmlTemplate = fallbackPrompt
        isTempFallback = true

        const fallbackAnalysis = await callAI({
          systemPrompt: fallbackPrompt,
          prompt: `请只执行“第一阶段：分析题目，生成 analysis_json”。
不要输出 HTML，不要输出多余解释，不要进入第二阶段。
请严格输出一个 JSON 对象，字段尽量完整，结构如下：
{
  "question_type": "",
  "known_conditions": [],
  "hidden_conditions": [],
  "verification_target": "",
  "core_discovery": "",
  "discovery_flow": [],
  "challenge_steps": [],
  "interaction_flow": {
    "trigger": "",
    "action": "",
    "feedback": [],
    "reset": ""
  },
  "animation_flow": {
    "type": "",
    "description": "",
    "visual_effect": [],
    "duration": ""
  },
  "component_rules": {
    "scene": "",
    "look": "",
    "control": "",
    "visual": "",
    "animation": "",
    "challenge": ""
  }
}

题目原文：
${question.question_text}

补充要求：
component_rules 不是组件清单，而是这个题目在观察区、发现区、挑战区分别要遵守的规则说明。`,
          responseFormat: 'json_object',
          temperature: 0.3,
          maxTokens: 12000,
          timeoutSeconds: 60,
        })
        const fallbackCoreDiscovery = fallbackTypeContext.coreDiscovery || questionCoreDiscovery || questionTypeName || ''
        let analysisJson = {
          question_type: fallbackCoreDiscovery || '暂未分类',
          known_conditions: [],
          hidden_conditions: [],
          verification_target: '',
          core_discovery: fallbackCoreDiscovery,
          discovery_flow: [],
          challenge_steps: [],
          interaction_flow: {
            trigger: '',
            action: '',
            feedback: [],
            reset: '',
          },
          animation_flow: {
            type: '',
            description: '',
            visual_effect: [],
            duration: '',
          },
          component_rules: {
            scene: '',
            look: '',
            control: '',
            visual: '',
            animation: '',
            challenge: '',
          },
        }
        if (fallbackAnalysis.success && fallbackAnalysis.content) {
          const parsedFallbackAnalysis = parseAnalysisJson(fallbackAnalysis.content)
          if (parsedFallbackAnalysis && typeof parsedFallbackAnalysis === 'object') {
            analysisJson = stripAnalysisNoise({
              ...analysisJson,
              ...parsedFallbackAnalysis,
              interaction_flow: {
                ...analysisJson.interaction_flow,
                ...(parsedFallbackAnalysis.interaction_flow && typeof parsedFallbackAnalysis.interaction_flow === 'object'
                  ? parsedFallbackAnalysis.interaction_flow
                  : {}),
              },
              animation_flow: {
                ...analysisJson.animation_flow,
                ...(parsedFallbackAnalysis.animation_flow && typeof parsedFallbackAnalysis.animation_flow === 'object'
                  ? parsedFallbackAnalysis.animation_flow
                  : {}),
              },
              component_rules: {
                ...analysisJson.component_rules,
                ...(parsedFallbackAnalysis.component_rules && typeof parsedFallbackAnalysis.component_rules === 'object'
                  ? parsedFallbackAnalysis.component_rules
                  : {}),
              },
            })
          }
        } else {
          console.warn('[generate/demo] temp analysis AI failed, using minimal fallback analysis', fallbackAnalysis.error)
        }

        analysisJson = stripAnalysisNoise(analysisJson)
        await patchQuestionFull(actualQuestionId, {
          core_discovery: fallbackTypeContext.coreDiscovery || questionCoreDiscovery || questionTypeName || '暂未分类',
          analysis_json: analysisJson,
          status: 'pending',
        })

        typeContext = fallbackTypeContext
        renderPlan = buildRenderPlan(fallbackTypeContext, analysisJson, question.question_text)
      }

      if (matchedType) {
        const normalizedMatchedCoreDiscovery = normalizeCoreDiscovery(matchedType.core_discovery)
        if (normalizedMatchedCoreDiscovery !== questionTypeName) {
          console.info('[generate/demo] question type matched after normalization', {
            questionId: actualQuestionId,
            rawCoreDiscovery: rawIdentifiedTypeName,
            normalizedCoreDiscovery: questionTypeName,
            matchedBy: matchResult.matchedBy,
            matchedTypeName: matchedType.name,
            matchedCoreDiscovery: matchedType.core_discovery,
          })
        }
      }

      // ── 正常 matchedType 路径 ──
      if (matchedType) {
        questionTypeId = matchedType.id
        typeContext = normalizeQuestionTypeRow(matchedType)
        htmlTemplate = typeContext.htmlPrompt || ''
        const typeName = typeContext.name || ''
        const typeCoreDiscovery = typeContext.coreDiscovery || ''
        const typeDiscoveryFlow = typeContext.discoveryFlow || ''
        const typeInteractionFlow = typeContext.interactionFlow || ''
        const typeAnimationFlow = typeContext.animationFlow || ''

        // 先保存题型信息（即使后续超时，至少题型已记录）
        await fetch(`${SUPABASE_URL}/rest/v1/user_questions?id=eq.${actualQuestionId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            question_type_id: questionTypeId,
            question_type: typeName,
            core_discovery: typeCoreDiscovery,
            status: 'pending',
          }),
        })

        // ── Step 3: 结构化分析（使用 analysis_prompt）──
        if (typeContext.analysisPrompt) {
          const flowInfo = [
            typeDiscoveryFlow && `🧠 思维引导流程：\n${typeDiscoveryFlow}`,
            typeInteractionFlow && `👆 交互操作流程：\n${typeInteractionFlow}`,
            typeAnimationFlow && `👀 视觉呈现流程：\n${typeAnimationFlow}`,
          ].filter(Boolean).join('\n\n')
          const typeContextSummary = buildTypeContextSummary(typeContext)
          const analysisRulesHint = [
            `额外要求：请把 component_rules 也作为 analysis_json 的一部分输出，但这里的 component_rules 必须是“规则说明”，不是组件清单。`,
            `它应该描述：`,
            `- scene：页面骨架如何组织`,
            `- look：观察区该展示什么、禁止放什么`,
            `- control：发现区如何承载操作`,
            `- visual：发现区如何承载展示`,
            `- animation：发现区如何承载变化和动画`,
            `- challenge：挑战区如何承载输入、验证和结果`,
            `规则请写成可直接给渲染器读取的结构化文本或对象。`,
          ].join('\n')

          const analysisResult = await callAI({
            systemPrompt: typeContext.analysisPrompt,
            prompt: [
              `请分析以下数学题：`,
              `题目原文：\n${question.question_text}`,
              ``,
              `--- 题型信息 ---`,
              typeContextSummary,
              flowInfo ? `\n${flowInfo}` : '',
              ``,
              analysisRulesHint,
              ``,
              `请结合上述题型信息和流程指导，对题目进行结构化分析，输出符合要求的 JSON。`,
            ].filter(Boolean).join('\n'),
            responseFormat: 'json_object',
            temperature: 0.5,
            maxTokens: 12000,
            timeoutSeconds: 60,
          })
          if (!analysisResult.success) {
            console.warn('[generate/demo] matched analysis AI failed, using minimal fallback analysis', analysisResult.error)
            analysisJson = buildMinimalFallbackAnalysis(
              question.question_text,
              typeContext.coreDiscovery || questionCoreDiscovery || questionTypeName || ''
            )
          } else {
            const parsedAnalysisJson = parseAnalysisJson(analysisResult.content)
            analysisJson = parsedAnalysisJson && typeof parsedAnalysisJson === 'object'
              ? parsedAnalysisJson
              : buildMinimalFallbackAnalysis(
                  question.question_text,
                  typeContext.coreDiscovery || questionCoreDiscovery || questionTypeName || ''
                )
          }
          analysisJson = stripAnalysisNoise(analysisJson)
        }

        // 保存分析结果（即使后续 HTML 生成超时，分析结果已落库）
        await fetch(`${SUPABASE_URL}/rest/v1/user_questions?id=eq.${actualQuestionId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            analysis_json: analysisJson,
          }),
        })
      }

      if (matchedType && typeContext) {
        renderPlan = buildRenderPlan(typeContext, analysisJson, question.question_text)
      }
    }

    if (!typeContext) {
      typeContext = normalizeQuestionTypeRow({
        name: questionTypeName || '暂未分类',
        core_discovery: questionCoreDiscovery || questionTypeName || '暂未分类',
        layout_component: '',
        look_component: '',
        control_component: '',
        visual_component: '',
        animation_component: '',
        challenge_component: '',
        default_assets: [],
        page_schema_version: 1,
        component_rules: {},
        fallback_strategy: {},
      })
    }

    if (!renderPlan) {
      renderPlan = buildRenderPlan(typeContext, analysisJson, question.question_text)
    }

    // ════════════════════════════════════════════════════════════
    // Step 4: 模板替换 — 用 analysis_json 填充 HTML 模板
    // ════════════════════════════════════════════════════════════
    if (!htmlTemplate) {
      // 已有题型数据但没加载到模板（重新生成路径）
      if (questionTypeId) {
        const templateRes = await fetch(
          `${SUPABASE_URL}/rest/v1/question_types?id=eq.${questionTypeId}`,
          { headers: { ...headers, Prefer: undefined } }
        )
        if (templateRes.ok) {
          const pt = await templateRes.json()
          htmlTemplate = pt?.[0]?.html_prompt || ''
        }
      }
    }

    if (!htmlContent && !htmlTemplate.trim()) {
      throw new Error('题型模板缺失，且当前题目未命中 temp 兜底模板')
    }

    // ── 执行模板替换 / AI 生成 ──
    const analysisJsonStr = JSON.stringify(analysisJson, null, 2)
    const renderPlanStr = JSON.stringify(renderPlan, null, 2)
    if (!htmlContent) {
      if (isTempFallback && htmlTemplate.trim()) {
        const tempHtmlPrompt = [
          `你是HTML渲染引擎。`,
          `请根据 analysis_json 和 render_plan 生成完整、可直接运行的单页 HTML。`,
          `只输出 HTML，不要解释，不要 Markdown，不要代码块，不要额外文本。`,
          ``,
          `渲染规则：`,
          `1. 页面必须是一个完整 HTML 文件。`,
          `2. 页面结构固定为三段式：观察区、发现区、挑战区。`,
          `3. 观察区：只展示题干、已知条件、隐含条件、数量关系，不放操作控件，也不要直接展示由已知条件可算出的答案。`,
          `4. 发现区：必须包含真实可交互控件，例如点击、拖拽、滑块、选择，并且要展示操作后的变化。`,
          `5. 发现区的内容要分成 control / visual / animation 三部分来理解：`,
          `   - control：孩子怎么操作`,
          `   - visual：孩子看到什么`,
          `   - animation：操作后页面怎么演`,
          `6. 挑战区：必须包含输入、验证、反馈和结论展示。`,
          `7. 页面必须优先手机端适配，同时兼容 PC。`,
          `8. 样式必须内置在 HTML 中，不依赖外部框架、外部图片、外部 CDN。`,
          `9. 所有交互必须可重置。`,
          `10. 发现区的动画和反馈必须来自 analysis_json 的 interaction_flow / animation_flow。`,
          `11. 如果 render_plan 里有组件信息，就按 render_plan 渲染；如果没有，就使用内置兜底组件，但兜底也必须保留真实交互。`,
          `12. 观察区优先使用 render_plan 的 observations / assets。`,
          `13. 发现区优先使用 render_plan 的 controls / visuals / animations。`,
          `14. 挑战区优先使用 render_plan 的 challenges。`,
          ``,
          `现在请基于以下数据生成 HTML：`,
          `analysis_json：`,
          `\`\`\`json`,
          `${analysisJsonStr}`,
          `\`\`\``,
          ``,
          `render_plan：`,
          `\`\`\`json`,
          `${renderPlanStr}`,
          `\`\`\``,
          ``,
          `题目原文：`,
          question.question_text,
        ].join('\n')
        const htmlResult = await callAI({
          systemPrompt: htmlTemplate,
          prompt: tempHtmlPrompt,
          temperature: 0.6,
          maxTokens: 12000,
          timeoutSeconds: 60,
        })
        if (!htmlResult.success || !htmlResult.content) {
          await patchQuestionFull(actualQuestionId, { status: 'pending' })
          return res.status(200).json({
            success: false,
            error: 'AI 生成 HTML 失败，请重试',
            questionId: actualQuestionId,
          })
        }
        const startIdx = htmlResult.content.search(/<!DOCTYPE\s+html|<html[^>]*>/i)
        const rawHtml = startIdx === -1 ? htmlResult.content.trim() : htmlResult.content.slice(startIdx).trim()
        const htmlEnd = rawHtml.search(/<\/html>\s*/i)
        htmlContent = htmlEnd !== -1 ? rawHtml.slice(0, htmlEnd + '<\/html>'.length) : rawHtml
      } else {
        htmlContent = buildPlanDrivenHtml(question.question_text, analysisJson, renderPlan)
      }
    }

    const generationResult = await consumeGeneration(question.user_id)
    if (!generationResult.success) {
      await recordGenerationArtifacts({
        headers,
        supabaseUrl: SUPABASE_URL,
        runId: generationRunId,
        questionId: actualQuestionId,
        typeContext,
        analysisJson,
        renderPlan,
        status: 'failed',
      })
      await patchQuestionFull(actualQuestionId, { status: 'pending' }).catch(() => {})
      return res.status(200).json({
        success: false,
        error: generationResult.error === 'quota_exceeded'
          ? '当前套餐生成次数已用完，请升级会员后再试'
          : '当前套餐没有可用的生成次数',
        questionId: actualQuestionId,
      })
    }

    const dataUrl = await saveHtmlToStorage(htmlContent, actualQuestionId)

    // ════════════════════════════════════════════════════════════
    // Step 5: 存入 question_demos + 标记 completed
    // ════════════════════════════════════════════════════════════
    const demoRes = await fetch(`${SUPABASE_URL}/rest/v1/question_demos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question_id: actualQuestionId,
        html_url: dataUrl,
        title: `演示 ${Date.now().toString().slice(-4)}`,
      }),
    })
    if (!demoRes.ok) throw new Error('保存演示失败')
    const demos = await demoRes.json()
    const demo = demos?.[0] || {}

    // 全部流程成功 → 标记为 completed（使用完整 headers，非 best effort）
    await patchQuestionFull(actualQuestionId, { status: 'completed' })
    await recordGenerationArtifacts({
      headers,
      supabaseUrl: SUPABASE_URL,
      runId: generationRunId,
      questionId: actualQuestionId,
      typeContext,
      analysisJson,
      renderPlan,
      status: renderPlan?.fallbackUsed ? 'partial' : 'success',
      htmlUrl: dataUrl,
      demoId: demo.id,
    })

    return res.status(200).json({
      success: true,
      demoId: demo.id,
      htmlUrl: dataUrl,
      questionId: actualQuestionId,
    })

  } catch (e) {
    console.error('[generate/demo] error:', e.message, e.stack)
    if (actualQuestionId) {
      try {
        await patchQuestionFull(actualQuestionId, { status: 'pending' })
      } catch { /* 静默处理 */ }
      try {
        await recordGenerationArtifacts({
          headers,
          supabaseUrl: SUPABASE_URL,
          runId: generationRunId,
          questionId: actualQuestionId,
          typeContext,
          analysisJson,
          renderPlan,
          status: 'failed',
        })
      } catch { /* 静默处理 */ }
    }
    return res.status(200).json({
      success: false,
      error: '题目已保存，生成过程出错了，请到「我的互动列表」中重新生成',
      questionId: actualQuestionId,
    })
  }
}

/**
 * 将 HTML 内容存入可访问的存储（优先 Kodo，降级 data:URL）
 */
/** URL Safe Base64 */
function urlsafe(s) {
  const b = typeof s === 'string' ? Buffer.from(s) : s
  return b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_')
}

/**
 * 构建 multipart/form-data body（手动，不依赖 FormData）
 */
function buildMultipart(fields, boundary) {
  const parts = []
  for (const { name, value, filename } of fields) {
    let header = `--${boundary}\r\nContent-Disposition: form-data; name="${name}"`
    if (filename) header += `; filename="${filename}"\r\nContent-Type: text/html; charset=utf-8`
    header += '\r\n\r\n'
    parts.push(Buffer.from(header), typeof value === 'string' ? Buffer.from(value, 'utf-8') : value, Buffer.from('\r\n'))
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`))
  return Buffer.concat(parts)
}

/**
 * 将 HTML 内容存入七牛 Kodo（优先），失败降级 data:URL
 */
async function saveHtmlToStorage(htmlContent, questionId) {
  const ak = process.env.QINIU_ACCESS_KEY
  const sk = process.env.QINIU_SECRET_KEY
  const domain = process.env.QINIU_DOMAIN
  const bucket = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab'

  if (ak && sk && domain) {
    try {
      const key = `MHTML/user/${questionId}/${Date.now()}.html`
      const putPolicy = JSON.stringify({ scope: `${bucket}:${key}`, deadline: Math.floor(Date.now()/1000)+3600 })
      const encodedPolicy = urlsafe(putPolicy)
      const sign = crypto.createHmac('sha1', sk).update(encodedPolicy).digest()
      const token = `${ak}:${urlsafe(sign)}:${encodedPolicy}`

      const boundary = `----QiniuFormBoundary${Date.now()}`
      const body = buildMultipart([
        { name: 'token', value: token },
        { name: 'key', value: key },
        { name: 'file', value: htmlContent, filename: `${Date.now()}.html` },
      ], boundary)

      const host = process.env.QINIU_UPLOAD_HOST || 'https://up.qiniup.com'
      const res = await fetch(host, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body,
      })
      if (res.ok) return `${domain}/${key}`
      const errText = await res.text().catch(() => '')
      console.warn('[saveHtmlToStorage] Kodo failed:', res.status, errText.slice(0, 200))
    } catch (e) {
      console.warn('[saveHtmlToStorage] Kodo exception:', e.message)
    }
  }
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent)
}
