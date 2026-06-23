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

import { callAI } from '../../server/lib/ai.js'
import { consumeGeneration } from '../../server/lib/membership.js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    controlComponent: row?.control_component || '',
    visualComponent: row?.visual_component || '',
    animationComponent: row?.animation_component || '',
    defaultAssets: safeJsonParse(row?.default_assets, []),
    pageSchemaVersion: Number(row?.page_schema_version || 1),
    componentRules: safeJsonParse(row?.component_rules, {}),
    fallbackStrategy: safeJsonParse(row?.fallback_strategy, {}),
    createdAt: row?.created_at || '',
    updatedAt: row?.updated_at || '',
  }
}

const KNOWN_COMPONENT_LIBRARY = {
  layout: new Set(['SceneFrame', 'TwoColumnLayout', 'SingleColumnLayout', 'ThreeZoneLayout', 'StickyAsideLayout']),
  control: new Set(['ClickControl', 'DragControl', 'SliderControl', 'StepButton', 'ChoiceControl', 'AnswerInput']),
  visual: new Set(['ItemIcon', 'ItemGroup', 'Counter', 'Box', 'DashedBox', 'SolidBox', 'Arrow', 'Balance', 'Bar', 'Timeline', 'NumberLine', 'PointSegment']),
  asset: new Set(['PersonIcon', 'BoxIcon', 'CupIcon', 'TreeIcon', 'CherryIcon', 'AppleIcon', 'RoadIcon', 'CoinIcon', 'MachineIcon', 'AnimalIcon']),
  animation: new Set(['Highlight', 'Move', 'Split', 'Merge', 'FadeOut', 'CountUp', 'Shake', 'Glow', 'ConnectLine', 'RevealGap']),
}

function inferLayoutFromAnalysis(analysisJson, typeContext) {
  const rules = safeJsonParse(typeContext.componentRules, {})
  const hint = [
    typeContext.layoutComponent,
    rules.layout_component,
    analysisJson?.scene?.layout,
    analysisJson?.scene?.type,
  ].find(Boolean)
  if (hint) return String(hint)
  if (analysisJson?.thinking_steps?.length) return 'SingleColumnLayout'
  if (analysisJson?.scene && analysisJson?.objects) return 'SceneFrame'
  if (analysisJson?.known_data && analysisJson?.discoveries) return 'ThreeZoneLayout'
  return 'TwoColumnLayout'
}

function inferControlComponents(analysisJson, typeContext) {
  const candidates = [
    ...normalizeComponentList(typeContext.controlComponent),
    ...normalizeComponentList(typeContext.componentRules?.control_components),
  ]
  if (candidates.length > 0) return [...new Set(candidates)]

  const controls = Array.isArray(analysisJson?.controls) ? analysisJson.controls : []
  if (controls.length > 0) {
    const mapped = controls.map((item) => {
      const text = String(item?.action || item?.type || item?.label || '').toLowerCase()
      if (text.includes('drag') || text.includes('拖')) return 'DragControl'
      if (text.includes('slide') || text.includes('滑')) return 'SliderControl'
      if (text.includes('choice') || text.includes('选') || text.includes('单选')) return 'ChoiceControl'
      if (text.includes('input') || text.includes('填') || text.includes('答')) return 'AnswerInput'
      return 'ClickControl'
    })
    return [...new Set(mapped)]
  }

  return ['ClickControl']
}

function inferVisualComponents(analysisJson, typeContext) {
  const candidates = [
    ...normalizeComponentList(typeContext.visualComponent),
    ...normalizeComponentList(typeContext.componentRules?.visual_components),
  ]
  if (candidates.length > 0) return [...new Set(candidates)]

  if (analysisJson?.known_data || analysisJson?.discoveries) return ['Counter', 'Bar']
  if (analysisJson?.scene?.objects) return ['ItemGroup']
  return ['Box']
}

function inferAnimationComponents(analysisJson, typeContext) {
  const candidates = [
    ...normalizeComponentList(typeContext.animationComponent),
    ...normalizeComponentList(typeContext.componentRules?.animation_components),
  ]
  if (candidates.length > 0) return [...new Set(candidates)]

  if (analysisJson?.thinking_steps?.length) return ['RevealGap']
  return ['FadeOut']
}

function inferDefaultAssets(typeContext, analysisJson) {
  const assets = Array.isArray(typeContext.defaultAssets) ? typeContext.defaultAssets : []
  if (assets.length > 0) return assets
  if (analysisJson?.scene?.objects?.length) return analysisJson.scene.objects
  return []
}

function buildRenderPlan(typeContext, analysisJson, questionText) {
  const componentRules = safeJsonParse(typeContext.componentRules, {})
  const fallbackStrategy = safeJsonParse(typeContext.fallbackStrategy, {})
  const missingComponents = []
  const missingCapabilities = []

  const layoutName = pickFirstString(
    typeContext.layoutComponent,
    componentRules.layout_component,
    inferLayoutFromAnalysis(analysisJson, typeContext),
  )
  if (!KNOWN_COMPONENT_LIBRARY.layout.has(layoutName)) {
    missingComponents.push({
      category: 'layout',
      name: layoutName || 'UnknownLayout',
      reason: typeContext.layoutComponent
        ? `question_types.layout_component=${typeContext.layoutComponent} 不在布局组件库`
        : '未配置 layout_component，使用推断布局',
      fallback: fallbackStrategy.layout || 'TwoColumnLayout',
    })
  }

  const controlComponents = inferControlComponents(analysisJson, typeContext)
  controlComponents.forEach((name) => {
    if (!KNOWN_COMPONENT_LIBRARY.control.has(name)) {
      missingComponents.push({
        category: 'control',
        name,
        reason: '控制组件不在已知组件库中',
        fallback: fallbackStrategy.control || 'ClickControl',
      })
    }
  })

  const visualComponents = inferVisualComponents(analysisJson, typeContext)
  visualComponents.forEach((name) => {
    if (!KNOWN_COMPONENT_LIBRARY.visual.has(name)) {
      missingComponents.push({
        category: 'visual',
        name,
        reason: '视觉组件不在已知组件库中',
        fallback: fallbackStrategy.visual || 'ItemGroup',
      })
    }
  })

  const animationComponents = inferAnimationComponents(analysisJson, typeContext)
  animationComponents.forEach((name) => {
    if (!KNOWN_COMPONENT_LIBRARY.animation.has(name)) {
      missingComponents.push({
        category: 'animation',
        name,
        reason: '动画组件不在已知组件库中',
        fallback: fallbackStrategy.animation || 'FadeOut',
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
        fallback: fallbackStrategy.asset || 'PersonIcon',
      })
    }
  })

  if (!Array.isArray(analysisJson?.controls) || analysisJson.controls.length === 0) {
    missingCapabilities.push({
      category: 'control',
      name: 'controls',
      reason: 'analysis_json 未产出 controls 字段，交互层只能使用默认控件',
      fallback: fallbackStrategy.control || 'ClickControl',
    })
  }

  if (!analysisJson?.scene && !analysisJson?.thinking_steps) {
    missingCapabilities.push({
      category: 'layout',
      name: 'scene',
      reason: 'analysis_json 缺少 scene / thinking_steps，页面骨架只能使用默认布局',
      fallback: fallbackStrategy.layout || 'TwoColumnLayout',
    })
  }

  const fallbackUsed = missingComponents.length > 0 || missingCapabilities.length > 0

  return {
    version: typeContext.pageSchemaVersion || 1,
    questionText,
    coreDiscovery: typeContext.coreDiscovery || '',
    layout: {
      name: layoutName,
      source: typeContext.layoutComponent ? 'question_types.layout_component' : 'inferred',
    },
    controls: controlComponents,
    visuals: visualComponents,
    animations: animationComponents,
    assets: defaultAssets,
    rules: componentRules,
    fallbackStrategy,
    matchedComponents: {
      layout: layoutName ? [layoutName] : [],
      controls: controlComponents,
      visuals: visualComponents,
      animations: animationComponents,
      assets: defaultAssets,
    },
    missingComponents,
    missingCapabilities,
    fallbackUsed,
  }
}

function buildTypeContextSummary(typeContext) {
  return [
    `core_discovery：${typeContext.coreDiscovery || ''}`,
    `name：${typeContext.name || ''}`,
    typeContext.layoutComponent ? `layout_component：${typeContext.layoutComponent}` : '',
    typeContext.controlComponent ? `control_component：${typeContext.controlComponent}` : '',
    typeContext.visualComponent ? `visual_component：${typeContext.visualComponent}` : '',
    typeContext.animationComponent ? `animation_component：${typeContext.animationComponent}` : '',
    typeContext.discoveryFlow ? `discovery_flow：${typeContext.discoveryFlow}` : '',
    typeContext.interactionFlow ? `interaction_flow：${typeContext.interactionFlow}` : '',
    typeContext.animationFlow ? `animation_flow：${typeContext.animationFlow}` : '',
    typeContext.analysisPrompt ? `analysis_prompt：${typeContext.analysisPrompt}` : '',
    typeContext.htmlPrompt ? `html_prompt：${typeContext.htmlPrompt}` : '',
    typeContext.componentRules ? `component_rules：${JSON.stringify(typeContext.componentRules)}` : '',
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

function buildStaticFallbackHtml(questionText, analysisJson, renderPlan) {
  const analysis = analysisJson && typeof analysisJson === 'object' ? analysisJson : {}
  const questionType = analysis.question_type || renderPlan?.coreDiscovery || '暂未分类'
  const coreDiscovery = analysis.core_discovery || renderPlan?.coreDiscovery || ''
  const verificationTarget = analysis.verification_target || ''
  const interactionFlow = analysis.interaction_flow || {}
  const animationFlow = analysis.animation_flow || {}

  const knownConditions = Array.isArray(analysis.known_conditions) ? analysis.known_conditions : []
  const hiddenConditions = Array.isArray(analysis.hidden_conditions) ? analysis.hidden_conditions : []
  const discoveryFlow = Array.isArray(analysis.discovery_flow) ? analysis.discovery_flow : []
  const challengeSteps = Array.isArray(analysis.challenge_steps) ? analysis.challenge_steps : []
  const feedbackItems = Array.isArray(interactionFlow.feedback) ? interactionFlow.feedback : []
  const visualEffects = Array.isArray(animationFlow.visual_effect) ? animationFlow.visual_effect : []

  const analysisJsonPretty = escapeHtml(JSON.stringify(analysisJson, null, 2))
  const renderPlanPretty = escapeHtml(JSON.stringify(renderPlan, null, 2))

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>互动演示</title>
<style>
:root{--pink:#FF0080;--purple:#7928CA;--blue:#0070F3;--bg:#FAFAFA;--card:#FFF;--ink:#171717;--body:#4D4D4D;--mute:#888}
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,system-ui,sans-serif}
body{background:var(--bg);color:var(--body);padding:16px;display:flex;justify-content:center;min-height:100vh}
.container{width:100%;max-width:760px;display:flex;flex-direction:column;gap:16px;padding-bottom:40px}
.card{background:var(--card);border-radius:24px;box-shadow:0 1px 3px rgba(0,0,0,.04),0 2px 8px rgba(0,0,0,.04);padding:22px}
.title{font-size:13px;color:var(--mute);margin-bottom:12px;font-weight:600;letter-spacing:.5px}
.q-text{font-size:15px;color:var(--ink);line-height:1.7;font-weight:600}
.badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.badge{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:var(--bg);font-size:12px;color:var(--body);border:1px solid #eee}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.section{background:var(--bg);border-radius:18px;padding:16px;border:1px solid rgba(0,0,0,.04)}
.section h3{font-size:14px;color:var(--ink);margin-bottom:10px}
ul{list-style:none;display:flex;flex-direction:column;gap:8px}
li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:#fff;border-radius:14px;border:1px solid #f0f0f0;line-height:1.6}
.idx{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff;font-size:12px;flex:none}
.empty{color:var(--mute);font-size:13px;padding:8px 0}
.kv{display:grid;grid-template-columns:120px 1fr;gap:10px 12px}
.k{color:var(--mute);font-size:12px}
.v{color:var(--ink);font-size:13px;line-height:1.7;white-space:pre-wrap}
.mono{white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #f0f0f0;border-radius:16px;padding:14px;font-size:11px;line-height:1.6;color:var(--body);overflow:auto}
.accent{background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff;border-radius:18px;padding:16px}
.accent .title{color:rgba(255,255,255,.8)}
.accent .q-text{color:#fff}
@media (max-width:640px){body{padding:12px}.card{padding:16px}.grid,.kv{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container">
  <div class="card accent">
    <div class="title">📝 题目</div>
    <div class="q-text">${escapeHtml(questionText)}</div>
  </div>

  <div class="card">
    <div class="title">🔎 分析概览</div>
    <div class="badges">
      <span class="badge">题型：${escapeHtml(questionType)}</span>
      <span class="badge">核心发现：${escapeHtml(coreDiscovery || '待分析')}</span>
      ${verificationTarget ? `<span class="badge">验证目标：${escapeHtml(verificationTarget)}</span>` : ''}
      ${renderPlan?.layout?.name ? `<span class="badge">布局：${escapeHtml(renderPlan.layout.name)}</span>` : ''}
    </div>
  </div>

  <div class="grid">
    <div class="section">
      <h3>1. 观察区</h3>
      <div class="kv">
        <div class="k">已知条件</div>
        <div class="v">${knownConditions.length ? `<ul>${renderListItems(knownConditions)}</ul>` : '<div class="empty">暂无已知条件</div>'}</div>
        <div class="k">隐含条件</div>
        <div class="v">${hiddenConditions.length ? `<ul>${renderListItems(hiddenConditions)}</ul>` : '<div class="empty">暂无隐含条件</div>'}</div>
      </div>
    </div>

    <div class="section">
      <h3>2. 发现区</h3>
      <div class="kv">
        <div class="k">探索路径</div>
        <div class="v">${discoveryFlow.length ? `<ul>${renderListItems(discoveryFlow)}</ul>` : '<div class="empty">暂无探索路径</div>'}</div>
        <div class="k">交互方式</div>
        <div class="v">${escapeHtml(interactionFlow.trigger || '点击/拖拽/滑动')}</div>
        <div class="k">交互反馈</div>
        <div class="v">${feedbackItems.length ? `<ul>${renderListItems(feedbackItems)}</ul>` : '<div class="empty">暂无反馈</div>'}</div>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="section">
      <h3>3. 挑战解题区</h3>
      <div class="kv">
        <div class="k">挑战步骤</div>
        <div class="v">${challengeSteps.length ? `<ul>${renderListItems(challengeSteps)}</ul>` : '<div class="empty">暂无挑战步骤</div>'}</div>
        <div class="k">验证目标</div>
        <div class="v">${escapeHtml(verificationTarget || '待补充')}</div>
      </div>
    </div>

    <div class="section">
      <h3>4. 动画说明</h3>
      <div class="kv">
        <div class="k">动画类型</div>
        <div class="v">${escapeHtml(animationFlow.type || renderPlan?.animations?.[0] || '淡出')}</div>
        <div class="k">动画描述</div>
        <div class="v">${escapeHtml(animationFlow.description || '根据题意自动演示数量关系变化')}</div>
        <div class="k">视觉效果</div>
        <div class="v">${visualEffects.length ? `<ul>${renderListItems(visualEffects)}</ul>` : '<div class="empty">暂无视觉效果</div>'}</div>
        <div class="k">时长</div>
        <div class="v">${escapeHtml(animationFlow.duration || '0.8s')}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>5. 调试信息</h3>
    <div class="kv">
      <div class="k">interaction_flow.action</div>
      <div class="v">${escapeHtml(interactionFlow.action || '')}</div>
      <div class="k">interaction_flow.reset</div>
      <div class="v">${escapeHtml(interactionFlow.reset || '提供重置按钮')}</div>
    </div>
    <div style="margin-top:12px" class="mono">${analysisJsonPretty}</div>
    <div style="margin-top:12px" class="mono">${renderPlanPretty}</div>
  </div>
</div>
</body>
</html>`
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
      gap_type: gap.category || 'component',
      gap_name: gap.name || '',
      gap_reason: gap.reason || '',
    })),
    ...(renderPlan?.missingCapabilities || []).map((gap) => ({
      gap_type: gap.category || 'capability',
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
          maxTokens: 10,
          timeoutSeconds: 5,
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
    let typeContext = null
    let renderPlan = null
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
        maxTokens: 20,
        timeoutSeconds: 5,
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
            control_component: '',
            visual_component: '',
            animation_component: '',
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
            layout: { name: 'unknown', source: 'identify_failed' },
            controls: [],
            visuals: [],
            animations: [],
            assets: [],
            rules: {},
            fallbackStrategy: {},
            matchedComponents: { layout: [], controls: [], visuals: [], animations: [], assets: [] },
            missingComponents: [{ category: 'layout', name: 'unknown', reason: 'AI 识别题型失败', fallback: 'TwoColumnLayout' }],
            missingCapabilities: [],
            fallbackUsed: true,
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

        if (fallbackPrompt) {
          const fallbackTypeContext = normalizeQuestionTypeRow({
            name: 'temp-fallback',
            core_discovery: questionCoreDiscovery || questionTypeName || '暂未分类',
            layout_component: 'temp_fallback',
            control_component: '',
            visual_component: '',
            animation_component: '',
            default_assets: [],
            page_schema_version: 1,
            component_rules: {},
            fallback_strategy: { html: 'configs.temp' },
          })
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
  }
}

题目原文：
${question.question_text}`,
            responseFormat: 'json_object',
            temperature: 0.3,
            maxTokens: 1200,
            timeoutSeconds: 6,
          })
          if (!fallbackAnalysis.success || !fallbackAnalysis.content) {
            await patchQuestionFull(actualQuestionId, { status: 'pending' })
            await recordGenerationArtifacts({
              headers,
              supabaseUrl: SUPABASE_URL,
              runId: generationRunId,
              questionId: actualQuestionId,
              typeContext: fallbackTypeContext,
              analysisJson: {},
              renderPlan: {
                version: fallbackTypeContext.pageSchemaVersion || 1,
                questionText: question.question_text,
                coreDiscovery: fallbackTypeContext.coreDiscovery || '',
                layout: { name: 'temp_fallback', source: 'configs.temp' },
                controls: [],
                visuals: [],
                animations: [],
                assets: [],
                rules: {},
                fallbackStrategy: { html: 'configs.temp' },
                matchedComponents: {
                  layout: [],
                  controls: [],
                  visuals: [],
                  animations: [],
                  assets: [],
                },
                missingComponents: [{
                  category: 'layout',
                  name: 'temp_fallback',
                  reason: '未匹配到 question_types，使用 configs.temp 兜底',
                  fallback: 'configs.temp',
                }],
                missingCapabilities: [],
                fallbackUsed: true,
              },
              status: 'failed',
            })
            return res.status(200).json({
              success: false,
              error: 'AI 分析暂时不可用，请到「我的互动列表」中重新生成',
              questionId: actualQuestionId,
            })
          }
          let analysisJson = {}
          try {
            analysisJson = JSON.parse(fallbackAnalysis.content)
          } catch {
            analysisJson = { raw: fallbackAnalysis.content }
          }

          const renderPlan = buildRenderPlan(fallbackTypeContext, analysisJson, question.question_text)
          await patchQuestionFull(actualQuestionId, {
            core_discovery: fallbackTypeContext.coreDiscovery || questionCoreDiscovery || questionTypeName || '暂未分类',
            analysis_json: analysisJson,
            status: 'pending',
          })

          // 使用本地静态模板渲染，避免 temp 分支再依赖页面脚本
          const fallbackHtml = buildStaticFallbackHtml(question.question_text, analysisJson, renderPlan)
          const dataUrl = await saveHtmlToStorage(fallbackHtml, actualQuestionId)

          // 标记为 completed（兜底也走分析 JSON + 本地模板）
          await patchQuestionFull(actualQuestionId, {
            question_type: '暂未分类',
            status: 'completed',
          })
          // 存入 question_demos
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
          await recordGenerationArtifacts({
            headers,
            supabaseUrl: SUPABASE_URL,
            runId: generationRunId,
            questionId: actualQuestionId,
            typeContext: fallbackTypeContext,
            analysisJson: {},
            renderPlan: fallbackRenderPlan,
            status: 'partial',
            htmlUrl: dataUrl,
            demoId: demo.id,
          })
          return res.status(200).json({
            success: true,
            demoId: demo.id,
            htmlUrl: dataUrl,
            questionId: actualQuestionId,
          })
        } else {
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
              control_component: '',
              visual_component: '',
              animation_component: '',
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
              layout: { name: 'unknown', source: 'no_fallback_prompt' },
              controls: [],
              visuals: [],
              animations: [],
              assets: [],
              rules: {},
              fallbackStrategy: {},
              matchedComponents: { layout: [], controls: [], visuals: [], animations: [], assets: [] },
              missingComponents: [{ category: 'layout', name: 'unknown', reason: '未找到配置 temp 兜底 prompt', fallback: 'TwoColumnLayout' }],
              missingCapabilities: [],
              fallbackUsed: true,
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
              `请结合上述题型信息和流程指导，对题目进行结构化分析，输出符合要求的 JSON。`,
            ].filter(Boolean).join('\n'),
            responseFormat: 'json_object',
            temperature: 0.5,
            maxTokens: 2048,
            timeoutSeconds: 5,
          })
          if (!analysisResult.success) throw new Error(`AI 分析失败: ${analysisResult.error}`)

          try {
            analysisJson = JSON.parse(analysisResult.content)
          } catch {
            analysisJson = { raw: analysisResult.content }
          }
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
        control_component: '',
        visual_component: '',
        animation_component: '',
        default_assets: [],
        page_schema_version: 1,
        component_rules: {},
        fallback_strategy: {},
      })
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

    if (!renderPlan) {
      renderPlan = buildRenderPlan(typeContext, analysisJson, question.question_text)
    }

    // 没有题型模板 → 使用内置通用模板（自适应多种 JSON 结构）
    if (!htmlTemplate || !htmlTemplate.trim()) {
      const d = JSON.stringify(analysisJson, null, 2)
      htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>互动演示</title>
<style>
:root{--pink:#FF0080;--purple:#7928CA;--blue:#0070F3;--bg:#FAFAFA;--card:#FFF;--ink:#171717;--body:#4D4D4D;--mute:#888}
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,system-ui,sans-serif}
body{background:var(--bg);color:var(--body);padding:16px;display:flex;justify-content:center;min-height:100vh}
.container{width:100%;max-width:680px;display:flex;flex-direction:column;gap:16px;padding-bottom:40px}
.card{background:var(--card);border-radius:24px;box-shadow:0 1px 3px rgba(0,0,0,.04),0 2px 8px rgba(0,0,0,.04);padding:24px;margin-bottom:16px}
.q-text{font-size:15px;color:var(--ink);line-height:1.6;font-weight:500}
h2{font-size:13px;color:var(--mute);margin-bottom:12px}
.section-label{font-size:11px;font-weight:600;color:var(--mute);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.stat-box{padding:16px;background:var(--bg);border-radius:16px;text-align:center}
.stat-value{font-size:20px;font-weight:700;color:var(--purple);margin-bottom:4px}
.stat-label{font-size:11px;color:var(--mute)}
.step{padding:16px;background:var(--bg);border-radius:12px;margin-bottom:12px;border-left:4px solid var(--purple)}
.step-num{font-size:11px;color:var(--mute);margin-bottom:4px}
.step-q{font-size:14px;color:var(--ink);font-weight:600;margin-bottom:8px}
.step-ans{font-size:13px;color:var(--blue);padding:8px 12px;background:rgba(0,112,243,.08);border-radius:8px;margin-bottom:6px}
.step-hint{font-size:12px;color:var(--mute);padding:8px 12px;background:var(--bg);border-radius:8px;border:1px dashed #ddd}
.step-concl{font-size:13px;color:#16a34a;padding:8px 12px;background:rgba(22,163,74,.08);border-radius:8px;margin-top:6px}
.answer-box{margin-top:16px;padding:16px;background:linear-gradient(135deg,var(--purple),var(--pink));border-radius:16px;color:#fff;text-align:center}
.obj-tag{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;background:var(--bg);border-radius:24px;font-size:13px;margin:0 4px 8px 0}
.ctrl-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:24px;font-size:13px;font-weight:500;border:1px solid #ddd;background:var(--card);color:var(--ink);margin:0 4px 8px 0}
.disc-card{padding:12px 16px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-size:13px;margin-bottom:8px;border-left:4px solid #16a34a}
.obs-card{padding:12px 16px;background:var(--bg);border-radius:12px;font-size:12px;color:var(--body);margin-bottom:8px;border-left:4px solid var(--blue)}
.raw-json{font-size:11px;font-family:monospace;background:var(--bg);padding:16px;border-radius:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;color:var(--body);line-height:1.5}
.equation{text-align:center;padding:16px;background:linear-gradient(135deg,rgba(121,40,202,.06),rgba(0,112,243,.06));border-radius:16px;font-size:16px;font-weight:600;color:var(--purple);margin:8px 0}
</style>
</head>
<body>
<div class="container" id="app-root">
<div class="card"><h2>📝 题目</h2><p class="q-text">\${question_text}</p></div>
<div id="dynamic-content"><p style="font-size:13px;color:var(--mute);text-align:center;padding:20px">加载中...</p></div>
</div>
<script>
var data = ${d};
(function(){try{var el=document.getElementById('dynamic-content');if(!el)return;if(!data){el.innerHTML='<div class="card"><p style="font-size:13px;color:var(--mute);text-align:center">暂无分析数据</p></div>';return;}

// ---------- 场景式（scene + objects + controls）----------
if(data.scene&&data.objects){var s=data.scene,o=data.objects,c=data.controls,k=data.known_data,di=data.discoveries,ob=data.observations,h=data.hidden_data;var h2='<div class="card">';
h2+='<div class="section-label">🧪 实验场景</div>';
h2+='<p style="font-size:14px;color:var(--body);line-height:1.6;margin-bottom:16px">'+esc(s.description)+'</p>';
if(o&&o.length){h2+='<div style="margin-bottom:12px">';o.forEach(function(x){h2+='<span class="obj-tag">'+esc(x.icon||'')+' '+esc(x.name||'')+'</span>'});h2+='</div>'}
if(c&&c.length){h2+='<div class="section-label" style="margin-top:12px">🎮 操作</div><div>';c.forEach(function(x){h2+='<span class="ctrl-btn">'+esc(x.action)+'</span>'});h2+='</div>'}
h2+='</div>';

// 已知数据
if(k&&k.length){h2+='<div class="card"><div class="section-label">📊 已知数据</div><div class="grid-2">';k.forEach(function(x){h2+='<div class="stat-box"><div class="stat-value">'+esc(x.total_value)+'<span style="font-size:13px;font-weight:400;color:var(--mute);margin-left:4px">'+esc(x.unit||'')+'</span></div><div class="stat-label">'+esc(x.label||'')+'</div></div>'});h2+='</div></div>'}

// 思考发现
if(di&&di.length){h2+='<div class="card"><div class="section-label">💡 思考发现</div>';di.forEach(function(x){h2+='<div class="disc-card">✨ '+esc(x.rule||'')+'</div>'});h2+='</div>'}

// 观察
if(ob&&ob.length){h2+='<div class="card"><div class="section-label">🔍 观察</div>';ob.forEach(function(x){h2+='<div class="obs-card">👁️ '+esc(x.phenomenon||'')+'</div>'});h2+='</div>'}

// 隐藏答案区域
if(h&&h.length){h2+='<div class="card" id="answer-section"><div class="section-label">🎯 隐藏发现</div>';h.forEach(function(x){h2+='<div class="stat-box" style="margin-bottom:8px"><div class="stat-label" style="font-size:13px">'+esc(x.label||'')+'</div><div class="stat-value" style="color:var(--mute);font-size:16px">点击按钮显示答案</div></div>'});h2+='<div style="text-align:center;margin-top:12px"><button onclick="document.querySelectorAll(\'#answer-section .stat-value\').forEach(function(e,i){e.textContent=answers[i]||\'?\';e.style.color=\'var(--purple)\'})" style="padding:8px 20px;border:none;border-radius:24px;background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff;font-size:13px;font-weight:500;cursor:pointer">🎯 显示答案</button></div></div>'}

el.innerHTML=h2;return}

// ---------- thinking_steps 格式（兼容旧版）----------
if(data.thinking_steps&&data.thinking_steps.length){var h3='<div class="card" id="steps-container"><div class="section-label">🔍 思维引导</div>';data.thinking_steps.forEach(function(s,i){h3+='<div class="step"><div class="step-num">步骤 '+(i+1)+'</div><div class="step-q">'+esc(s.teacher_question||s.title||'')+'</div><div class="step-ans">✅ 答案：'+(s.correct_answer!=null?s.correct_answer:'')+'</div>';if(s.hint)h3+='<div class="step-hint">💡 提示：'+esc(s.hint)+'</div>';if(s.conclusion)h3+='<div class="step-concl">📌 '+esc(s.conclusion)+'</div>';h3+='</div>'});if(data.answer)h3+='<div class="answer-box">🎉 最终答案：'+JSON.stringify(data.answer)+'</div>';h3+='</div>';el.innerHTML=h3;return}

// ---------- 通用数据视图（known_data 等）----------
if(data.known_data){var h4='<div class="card"><div class="section-label">📊 分析数据</div>';if(Array.isArray(data.known_data)){data.known_data.forEach(function(x){h4+='<div class="stat-box" style="margin-bottom:8px"><div class="stat-value">'+esc(x.total_value||x.value||'')+'</div><div class="stat-label">'+esc(x.label||'')+'</div></div>'})}else{h4+='<pre class="raw-json">'+esc(JSON.stringify(data.known_data,null,2))+'</pre>'}h4+='</div>';el.innerHTML=h4;return}

// ---------- 兜底：格式化 JSON ----------
el.innerHTML='<div class="card"><div class="section-label">📊 分析结果</div><pre class="raw-json">'+esc(JSON.stringify(data,null,2))+'</pre></div>';}catch(e){var errEl=document.getElementById('dynamic-content');if(errEl)errEl.innerHTML='<div class="card"><p style="font-size:13px;color:var(--mute);text-align:center">无法加载分析内容</p></div>'}})()
function esc(s){if(typeof s!=='string')return String(s||'');return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
var answers=[];
try{var r=data;if(r.hidden_data)answers=r.hidden_data.map(function(x){return x.label||'?'});if(r.discoveries&&answers.length===0)answers=r.discoveries.map(function(x,i){return r.known_data&&r.known_data.length>i?'\u89e3\u51b3\u65b9\u6848 '+(i+1):''})}catch(e){}
<\/script>
</body>
</html>`
    }

    // ── 执行模板替换 / AI 生成 ──
    const analysisJsonStr = JSON.stringify(analysisJson, null, 2)
    const renderPlanStr = JSON.stringify(renderPlan, null, 2)
    let htmlContent

    // 判断 htmlTemplate 中是否含有 ${analysis_json} / ${render_json} / ${question_text} 占位符
    const hasPlaceholders = htmlTemplate.includes('\${analysis_json}')
      || htmlTemplate.includes('\${render_json}')
      || htmlTemplate.includes('\${question_text}')

    if (!hasPlaceholders && htmlTemplate.trim()) {
      // 没有占位符 → html_prompt 是 AI 提示词 → 调 AI 生成 HTML
      const htmlResult = await callAI({
        systemPrompt: htmlTemplate,
        prompt: `以下是题目的结构化分析数据、渲染计划，以及题目原文。请根据 prompt 的指示生成完整的互动 HTML 页面。\n\n分析数据：\n\`\`\`json\n${analysisJsonStr}\n\`\`\`\n\n渲染计划：\n\`\`\`json\n${renderPlanStr}\n\`\`\`\n\n题目原文：\n${question.question_text}`,
        temperature: 0.6,
        maxTokens: 16384,
        timeoutSeconds: 9,
      })
      if (!htmlResult.success || !htmlResult.content) {
        await patchQuestionFull(actualQuestionId, { status: 'pending' })
        return res.status(200).json({
          success: false,
          error: 'AI 生成 HTML 失败，请重试',
          questionId: actualQuestionId,
        })
      }

      // 清理 HTML：只保留 DOCTYPE~html 之间的内容
      const startIdx = htmlResult.content.search(/<!DOCTYPE\s+html|<html[^>]*>/i)
      const rawHtml = startIdx === -1 ? htmlResult.content.trim() : htmlResult.content.slice(startIdx).trim()
      const htmlEnd = rawHtml.search(/<\/html>\s*/i)
      htmlContent = htmlEnd !== -1 ? rawHtml.slice(0, htmlEnd + '<\/html>'.length) : rawHtml
    } else {
      // 含占位符 → 字符串替换（兼容旧版或内置模板）
      htmlContent = htmlTemplate
        .replace(/\$\{analysis_json\}/g, () => analysisJsonStr)
        .replace(/\$\{render_json\}/g, () => renderPlanStr)
        .replace(/\$\{question_text\}/g, () => question.question_text)
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
        htmlUrl: dataUrl,
        demoId: demo.id,
      })
      await fetch(`${SUPABASE_URL}/rest/v1/question_demos?id=eq.${demo.id}`, {
        method: 'DELETE',
        headers,
      }).catch(() => {})
      await patchQuestionFull(actualQuestionId, { status: 'pending' }).catch(() => {})
      return res.status(200).json({
        success: false,
        error: generationResult.error === 'quota_exceeded'
          ? '当前套餐生成次数已用完，请升级会员后再试'
          : '当前套餐没有可用的生成次数',
        questionId: actualQuestionId,
      })
    }

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
