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
      const mathCheck = await callAI({
        prompt: `请判断以下内容是否为一道数学题，只回答「是」或「否」，不要任何其他文字。\n\n内容：${questionText}`,
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

      if (mathCheck.content.trim() !== '是') {
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
          const fallbackRenderPlan = {
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
          }
          // temp 是一个综合 prompt → AI 直接生成完整 HTML
          const htmlResult = await callAI({
            systemPrompt: fallbackPrompt,
            prompt: `题目原文：\n\n${question.question_text}`,
            temperature: 0.6,
            maxTokens: 16384,
            timeoutSeconds: 9,
          })
          if (!htmlResult.success || !htmlResult.content) {
            await patchQuestionFull(actualQuestionId, { status: 'pending' })
            await recordGenerationArtifacts({
              headers,
              supabaseUrl: SUPABASE_URL,
              runId: generationRunId,
              questionId: actualQuestionId,
              typeContext: fallbackTypeContext,
              analysisJson: {},
              renderPlan: fallbackRenderPlan,
              status: 'failed',
            })
            return res.status(200).json({
              success: false,
              error: 'AI 生成暂时不可用，请到「我的互动列表」中重新生成',
              questionId: actualQuestionId,
            })
          }
          // 清理 HTML：只保留 DOCTYPE~html 之间的内容
          const startIdx = htmlResult.content.search(/<!DOCTYPE\s+html|<html[^>]*>/i)
          const fallbackHtmlRaw = startIdx === -1 ? htmlResult.content.trim() : htmlResult.content.slice(startIdx).trim()
          const htmlEnd = fallbackHtmlRaw.search(/<\/html>\s*/i)
          const fallbackHtml = htmlEnd !== -1 ? fallbackHtmlRaw.slice(0, htmlEnd + '<\/html>'.length) : fallbackHtmlRaw
          const dataUrl = await saveHtmlToStorage(fallbackHtml, actualQuestionId)

          // 标记为 completed（走 temp 不经过 analysis_json 流程）
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
