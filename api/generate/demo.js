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
import { getSupabaseEnv } from '../../server/lib/supabase-env.js'
import crypto from 'crypto'

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

function buildHeuristicFallbackAnalysis(questionText, coreDiscoveryHint = '') {
  const text = String(questionText || '').trim()
  const numbers = (text.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => Number.isFinite(n))
  const pick = (index, fallback = 0) => (Number.isFinite(numbers[index]) ? numbers[index] : fallback)
  const total = pick(0, 0)
  const used = pick(1, 0)
  const days = Math.max(1, pick(2, 1))
  const remaining = Math.max(0, total - used)
  const average = Number((remaining / days).toFixed(2))

  const isRemainingAverage = /(剩下|余下|还剩|已经用掉|已经吃了|用掉|吃了)/.test(text) && /(平均每天|每天)/.test(text)
  const isUnitConversion = /(单位|换算|米|厘米|分米|毫米|千米)/.test(text) && /(换算|多少厘米|多少米|多少千米)/.test(text)
  const isEngineering = /(工程|铺设|完工|完成任务|每天)/.test(text)

  if (isRemainingAverage && numbers.length >= 3) {
    return {
      question_type: '剩余平均分（归一问题）',
      known_conditions: [
        `总量：${total}`,
        `已用/已吃：${used}`,
        `天数：${days}`,
      ],
      hidden_conditions: [
        '先求剩余总量',
        '再平均分成若干天',
      ],
      verification_target: '平均每天要用多少',
      core_discovery: '先求剩余总量，再平均分配到每天，得出平均每天用量',
      discovery_flow: [
        '先观察总量和已用量',
        '再求出剩余量',
        '最后平均分配到每天',
      ],
      challenge_steps: [
        `先算剩余：${total} - ${used}`,
        `再平均分：剩余 ÷ ${days}`,
        '得到平均每天的用量',
      ],
      interaction_flow: {
        trigger: '点击计算按钮',
        action: '先显示剩余量，再平均分配到每天',
        feedback: [
          `剩余量为 ${remaining}`,
          `平均每天约 ${average}`,
          '可以重置重新观察',
        ],
        reset: '重置后恢复初始数据',
      },
      animation_flow: {
        type: '拆分',
        description: '先把总量减去已用部分，再把剩余量平均分到每天',
        visual_effect: ['已用部分变灰', '剩余部分高亮', '平均分配展示'],
        duration: '0.8s',
      },
      knowledge: '归总问题',
      known_data: {
        total,
        used,
        days,
        remaining,
      },
      answer: {
        value: average,
        unit: '千克',
      },
    }
  }

  if (isUnitConversion) {
    return {
      question_type: '不同单位必须先统一',
      known_conditions: numbers.length ? [`已知数量：${numbers[0]}`] : [text],
      hidden_conditions: ['需要先统一单位后再计算'],
      verification_target: '换算结果',
      core_discovery: coreDiscoveryHint || '不同单位必须先统一',
      discovery_flow: ['先看单位', '再统一单位', '最后计算结果'],
      challenge_steps: ['确定单位关系', '进行换算', '得到最终结果'],
      interaction_flow: {
        trigger: '点击换算按钮',
        action: '将数量统一到相同单位',
        feedback: ['显示单位关系', '展示换算过程', '高亮答案'],
        reset: '重置后回到初始状态',
      },
      animation_flow: {
        type: '单位变化',
        description: '把数量逐步转换成统一单位',
        visual_effect: ['单位切换', '数值变化', '答案高亮'],
        duration: '0.8s',
      },
      knowledge: '长度单位换算',
      known_data: { value: numbers[0] || 0 },
      answer: {},
    }
  }

  if (isEngineering) {
    const perDay = pick(0, 0)
    const originalDays = pick(1, 0)
    const targetDays = pick(2, 0)
    const totalLength = perDay && originalDays ? perDay * originalDays : 0
    const answerValue = targetDays ? Number((totalLength / targetDays).toFixed(2)) : perDay
    return {
      question_type: '归总问题',
      known_conditions: [text],
      hidden_conditions: ['总量不变', '先求总量，再除以目标天数'],
      verification_target: '平均每天要完成多少',
      core_discovery: coreDiscoveryHint || '工作总量一定时，工作效率和工作时间成反比',
      discovery_flow: ['先求总量', '再换算天数', '最后得到每天的量'],
      challenge_steps: ['先求总量', '再除以目标天数', '得到每天的量'],
      interaction_flow: {
        trigger: '拖动滑块',
        action: '保持总量不变，调整天数',
        feedback: ['显示总量', '展示除法过程', '高亮答案'],
        reset: '重置后回到初始状态',
      },
      animation_flow: {
        type: '拆分与合并',
        description: '总量先保持不变，再随天数变化进行平均分配',
        visual_effect: ['总量高亮', '数值变化', '答案突出'],
        duration: '0.8s',
      },
      knowledge: '工程问题',
      known_data: {
        per_day,
        original_days,
        target_days,
        total_length: totalLength,
      },
      answer: { value: answerValue, unit: '米' },
    }
  }

  return {
    question_type: coreDiscoveryHint || '暂未分类',
    known_conditions: text ? [text] : [],
    hidden_conditions: ['请继续补充题目条件'],
    verification_target: text || '待补充',
    core_discovery: coreDiscoveryHint || '请先识别题目核心规律',
    discovery_flow: ['先观察题目', '再找出关键条件', '最后完成推理'],
    challenge_steps: ['理解题意', '整理条件', '得出答案'],
    interaction_flow: {
      trigger: '点击按钮',
      action: '根据题意触发变化',
      feedback: ['展示题目信息', '展示推理过程', '高亮答案'],
      reset: '重置后回到初始状态',
    },
    animation_flow: {
      type: '步骤推进',
      description: '根据题意逐步展示变化过程',
      visual_effect: ['数值变化', '步骤高亮', '答案突出'],
      duration: '0.8s',
    },
    knowledge: '待识别',
    known_data: {},
    answer: {},
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
  scene: new Set(['ThreeZoneLayout']),
  observation: new Set(['MTitle', 'MHint', 'MCard', 'MInput', 'MProgress', 'MResult', 'Counter', 'ItemIcon', 'ItemGroup', 'Box', 'DashedBox', 'SolidBox', 'Arrow', 'Balance', 'Bar', 'Timeline', 'NumberLine', 'PointSegment', 'PersonIcon', 'BoxIcon', 'CupIcon', 'TreeIcon', 'CherryIcon', 'AppleIcon', 'RoadIcon', 'CoinIcon', 'MachineIcon', 'AnimalIcon']),
  discovery: new Set(['ClickControl', 'DragControl', 'SliderControl', 'StepButton', 'ChoiceControl', 'MButton', 'Highlight', 'Move', 'Split', 'Merge', 'FadeOut', 'CountUp', 'Shake', 'Glow', 'ConnectLine', 'RevealGap']),
  challenge: new Set(['AnswerInput', 'MResult', 'MProgress', 'StepButton', 'ChoiceControl', 'MButton', 'CountUp', 'Glow', 'Shake', 'RevealGap']),
  // Legacy buckets kept for compatibility with older render plans and logs.
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
    rules.scene_component,
    rules.scene_components,
    analysisJson?.scene?.layout,
    analysisJson?.scene?.type,
  ].find(Boolean)
  if (hint) return String(hint)
  if (analysisJson?.thinking_steps?.length) return 'SingleColumnLayout'
  if (analysisJson?.scene && analysisJson?.objects) return 'SceneFrame'
  if (analysisJson?.known_data && analysisJson?.discoveries) return 'ThreeZoneLayout'
  return 'ThreeZoneLayout'
}

function inferObservationComponents(analysisJson, typeContext) {
  const candidates = [
    ...normalizeComponentList(typeContext.controlComponent),
    ...normalizeComponentList(typeContext.componentRules?.control_components),
    ...normalizeComponentList(typeContext.componentRules?.observation_component),
    ...normalizeComponentList(typeContext.componentRules?.observation_components),
  ]
  if (candidates.length > 0) return [...new Set(candidates)]

  if (analysisJson?.known_data || analysisJson?.discoveries || analysisJson?.known_conditions) return ['MCard', 'MHint']
  if (analysisJson?.scene?.objects) return ['ItemGroup']
  return ['MCard']
}

function inferDiscoveryComponents(analysisJson, typeContext) {
  const candidates = [
    ...normalizeComponentList(typeContext.visualComponent),
    ...normalizeComponentList(typeContext.componentRules?.visual_components),
    ...normalizeComponentList(typeContext.componentRules?.discovery_component),
    ...normalizeComponentList(typeContext.componentRules?.discovery_components),
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

function inferChallengeComponents(analysisJson, typeContext) {
  const candidates = [
    ...normalizeComponentList(typeContext.animationComponent),
    ...normalizeComponentList(typeContext.componentRules?.animation_components),
    ...normalizeComponentList(typeContext.componentRules?.challenge_component),
    ...normalizeComponentList(typeContext.componentRules?.challenge_components),
  ]
  if (candidates.length > 0) return [...new Set(candidates)]

  if (analysisJson?.answer || analysisJson?.verification_target) return ['AnswerInput', 'MResult']
  if (analysisJson?.challenge_steps?.length) return ['AnswerInput']
  return ['AnswerInput']
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
    componentRules.scene_component,
    componentRules.scene_components,
    inferLayoutFromAnalysis(analysisJson, typeContext),
  )
  if (!KNOWN_COMPONENT_LIBRARY.scene.has(layoutName) && !KNOWN_COMPONENT_LIBRARY.layout.has(layoutName)) {
    missingComponents.push({
      category: 'scene',
      name: layoutName || 'UnknownLayout',
      reason: typeContext.layoutComponent
        ? `question_types.layout_component=${typeContext.layoutComponent} 不在三段式布局组件库`
        : '未配置 layout_component，使用推断布局',
      fallback: fallbackStrategy.layout || 'ThreeZoneLayout',
    })
  }

  const observationComponents = inferObservationComponents(analysisJson, typeContext)
  observationComponents.forEach((name) => {
    if (!KNOWN_COMPONENT_LIBRARY.observation.has(name) && !KNOWN_COMPONENT_LIBRARY.visual.has(name)) {
      missingComponents.push({
        category: 'observation',
        name,
        reason: '观察区组件不在已知组件库中',
        fallback: fallbackStrategy.observation || 'MCard',
      })
    }
  })

  const discoveryComponents = inferDiscoveryComponents(analysisJson, typeContext)
  discoveryComponents.forEach((name) => {
    if (!KNOWN_COMPONENT_LIBRARY.discovery.has(name) && !KNOWN_COMPONENT_LIBRARY.control.has(name) && !KNOWN_COMPONENT_LIBRARY.animation.has(name)) {
      missingComponents.push({
        category: 'discovery',
        name,
        reason: '发现区组件不在已知组件库中',
        fallback: fallbackStrategy.discovery || 'ClickControl',
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
        fallback: fallbackStrategy.challenge || 'AnswerInput',
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
      category: 'discovery',
      name: 'controls',
      reason: 'analysis_json 未产出 controls 字段，交互层只能使用默认控件',
      fallback: fallbackStrategy.discovery || 'ClickControl',
    })
  }

  if (!analysisJson?.scene && !analysisJson?.thinking_steps) {
    missingCapabilities.push({
      category: 'scene',
      name: 'scene',
      reason: 'analysis_json 缺少 scene / thinking_steps，页面骨架只能使用默认布局',
      fallback: fallbackStrategy.layout || 'ThreeZoneLayout',
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
    scene: [layoutName].filter(Boolean),
    observations: observationComponents,
    discoveries: discoveryComponents,
    challenges: challengeComponents,
    controls: discoveryComponents,
    visuals: observationComponents,
    animations: challengeComponents,
    assets: defaultAssets,
    rules: componentRules,
    fallbackStrategy,
    matchedComponents: {
      scene: [layoutName].filter(Boolean),
      observations: observationComponents,
      discoveries: discoveryComponents,
      challenges: challengeComponents,
      layout: layoutName ? [layoutName] : [],
      controls: discoveryComponents,
      visuals: observationComponents,
      animations: challengeComponents,
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
    typeContext.componentRules?.scene_components ? `scene_components：${JSON.stringify(typeContext.componentRules.scene_components)}` : '',
    typeContext.componentRules?.observation_components ? `observation_components：${JSON.stringify(typeContext.componentRules.observation_components)}` : '',
    typeContext.componentRules?.discovery_components ? `discovery_components：${JSON.stringify(typeContext.componentRules.discovery_components)}` : '',
    typeContext.componentRules?.challenge_components ? `challenge_components：${JSON.stringify(typeContext.componentRules.challenge_components)}` : '',
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

function looksLikeHtmlDocument(value) {
  const text = String(value || '').trim()
  if (!text) return false
  return /<!DOCTYPE\s+html|<html[\s>]/i.test(text) && /<\/html>/i.test(text)
}

function buildStaticFallbackHtml(questionText, analysisJson, renderPlan) {
  const analysis = analysisJson && typeof analysisJson === 'object' ? analysisJson : {}

  const normalizeList = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
    if (value == null) return []
    const text = String(value).trim()
    if (!text) return []
    return [text]
  }

  const parseKnownData = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    return Object.entries(value).map(([key, val]) => `${key}：${String(val ?? '')}`)
  }

  const extractNumbers = (text) => {
    const matches = String(text || '').match(/-?\d+(?:\.\d+)?/g) || []
    return matches.map(Number).filter((n) => Number.isFinite(n))
  }

  const extractFirstNumber = (...values) => {
    for (const value of values) {
      const num = extractNumbers(value)[0]
      if (typeof num === 'number') return num
    }
    return null
  }

  const questionType = analysis.question_type || analysis.knowledge || renderPlan?.coreDiscovery || '暂未分类'
  const coreDiscovery = analysis.core_discovery || renderPlan?.coreDiscovery || questionType || ''
  const verificationTarget = analysis.verification_target || ''
  const knownConditions = normalizeList(analysis.known_conditions).length > 0
    ? normalizeList(analysis.known_conditions)
    : parseKnownData(analysis.known_data)
  const hiddenConditions = normalizeList(analysis.hidden_conditions)
  const discoveryFlow = normalizeList(analysis.discovery_flow)
  const challengeSteps = normalizeList(analysis.challenge_steps)
  const interactionFlow = analysis.interaction_flow && typeof analysis.interaction_flow === 'object'
    ? analysis.interaction_flow
    : {}
  const answerText = analysis.answer
    ? (typeof analysis.answer === 'object' ? JSON.stringify(analysis.answer) : String(analysis.answer))
    : ''
  const answerValue = analysis.answer && typeof analysis.answer === 'object'
    ? String(analysis.answer.value ?? '')
    : String(analysis.answer ?? '')
  const answerUnit = analysis.answer && typeof analysis.answer === 'object'
    ? String(analysis.answer.unit ?? '')
    : ''
  const allNumericSource = [
    questionText,
    verificationTarget,
    ...knownConditions,
    ...hiddenConditions,
    ...challengeSteps,
    ...discoveryFlow,
    answerText,
  ].join(' ')
  const totalValue = extractFirstNumber(questionText, knownConditions[0], allNumericSource) ?? 0
  const usedValue = extractFirstNumber(knownConditions[1], challengeSteps[0], allNumericSource)
  const daysValue = extractFirstNumber(knownConditions[2], challengeSteps[1], allNumericSource)
  const remainingValue =
    Number.isFinite(totalValue) && Number.isFinite(usedValue)
      ? Math.max(0, totalValue - usedValue)
      : extractFirstNumber(challengeSteps[0], challengeSteps[1], allNumericSource)
  const averageValue =
    Number.isFinite(remainingValue) && Number.isFinite(daysValue) && Number(daysValue) > 0
      ? Number((remainingValue / Number(daysValue)).toFixed(2))
      : extractFirstNumber(answerValue, verificationTarget, answerText, challengeSteps[2], allNumericSource)
  const derivedAnswerText = averageValue != null
    ? `${averageValue}${answerUnit || '千克'}`
    : (answerText || verificationTarget || '')
  const startNumber = Number.isFinite(totalValue) ? totalValue : (extractFirstNumber(...knownConditions, questionText) ?? 0)
  const targetNumber = Number.isFinite(remainingValue) ? remainingValue : (Number.isFinite(averageValue) ? averageValue : (startNumber + 1))
  const maxNumber = Math.max(startNumber, targetNumber, 1)
  const feedbackItems = normalizeList(interactionFlow.feedback)
  const discoveryHints = feedbackItems.length > 0
    ? feedbackItems
    : ['拖动滑块观察变化', '点击按钮推进步骤', '输入答案后验证']
  const hasAnswer = Boolean(derivedAnswerText || verificationTarget)
  const derivedSummaryItems = [
    Number.isFinite(totalValue) ? `总量：${totalValue}千克` : '',
    Number.isFinite(usedValue) ? `已吃：${usedValue}千克` : '',
    Number.isFinite(remainingValue) ? `剩余：${remainingValue}千克` : '',
    Number.isFinite(daysValue) ? `天数：${daysValue}天` : '',
    Number.isFinite(averageValue) ? `平均每天：${averageValue}${answerUnit || '千克'}` : '',
  ].filter(Boolean)

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
.hero .muted,.hero .label{color:rgba(255,255,255,.8)}
.title{font-size:13px;font-weight:700;letter-spacing:.5px;color:var(--mute);margin-bottom:12px}
.hero .title{color:rgba(255,255,255,.9)}
.q{font-size:15px;line-height:1.8;font-weight:600;color:var(--ink)}
.hero .q{color:#fff}
.section-grid{display:flex;flex-direction:column;gap:12px}
.section-title{font-size:15px;font-weight:700;color:var(--ink);margin-bottom:10px}
.chip-row{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid #ebe4ff;background:#f7f4ff;color:var(--purple);font-size:12px;line-height:1.4}
.chip.gray{background:#fff;border-color:var(--line);color:var(--body)}
.box{border-radius:18px;border:1px solid var(--line);background:#fff;padding:14px}
.box.soft{background:var(--bg)}
.k-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.kv{font-size:12px;color:var(--mute);margin-bottom:6px}
.text{font-size:13px;line-height:1.7;color:var(--body);white-space:pre-wrap}
.btn-row{display:flex;flex-wrap:wrap;gap:8px}
.btn{border:none;border-radius:999px;padding:10px 14px;background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff;font-weight:700;font-size:13px;cursor:pointer}
.btn.secondary{background:#fff;color:var(--ink);border:1px solid var(--line)}
.btn.ghost{background:#f7f7f7;color:var(--body);border:1px solid #ededed}
.btn:disabled{opacity:.45;cursor:not-allowed}
.input{width:100%;border:1px solid #e7e7e7;border-radius:14px;padding:12px 14px;font-size:14px;background:#fff;color:var(--ink);outline:none}
.input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,112,243,.08)}
.feedback{margin-top:10px;border-radius:14px;background:#f8f7ff;border:1px solid #ece5ff;color:var(--purple);padding:12px 14px;font-size:13px;line-height:1.7}
.feedback.good{background:#eefdf3;border-color:#caedcf;color:#15803d}
.feedback.bad{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
.progress{height:12px;border-radius:999px;background:#f1eefb;overflow:hidden}
.progress > span{display:block;height:100%;border-radius:999px;background:linear-gradient(135deg,var(--purple),var(--pink));width:0%;transition:width .25s ease}
.layout{display:grid;gap:12px;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)}
.visual{display:grid;gap:12px}
.meter{border-radius:20px;background:linear-gradient(135deg,rgba(121,40,202,.08),rgba(255,0,128,.08));padding:16px;border:1px solid rgba(121,40,202,.12)}
.meter-num{font-size:32px;font-weight:800;color:var(--ink);line-height:1}
.meter-sub{font-size:12px;color:var(--body);margin-top:6px}
.slider{width:100%;accent-color:var(--link)}
.stage{display:flex;flex-direction:column;gap:12px}
.stage-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:12px;color:var(--body)}
.stage-pill.active{background:#eef5ff;border-color:#cfe0ff;color:var(--blue)}
.step-list{display:flex;flex-direction:column;gap:8px}
.step{padding:10px 12px;border-radius:14px;background:#fff;border:1px solid var(--line);font-size:13px;line-height:1.6;color:var(--body)}
.core{border-radius:16px;background:#eef5ff;border:1px solid #d6e7ff;padding:12px 14px;color:var(--blue);font-size:13px;line-height:1.7}
.core.hidden{display:none}
@media (max-width:760px){body{padding:12px}.card{padding:16px}.layout,.k-grid{grid-template-columns:1fr}}
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
    <div class="chip-row">
      ${knownConditions.length ? knownConditions.map((item) => `<span class="chip gray">${escapeHtml(item)}</span>`).join('') : '<span class="chip gray">暂无已知条件</span>'}
      ${hiddenConditions.length ? hiddenConditions.map((item) => `<span class="chip gray">${escapeHtml(item)}</span>`).join('') : ''}
    </div>
  </section>

  <section class="card">
    <div class="section-title">2. 发现区</div>
    <div class="layout">
      <div class="box soft">
        <div class="kv">互动控制</div>
        <div class="stage">
          <div class="chip-row">
            <span class="stage-pill active" id="mode-pill">先算剩余</span>
            <span class="stage-pill" id="step-pill">第 1 步</span>
            <span class="stage-pill" id="progress-pill">探索中</span>
          </div>
          <input id="discovery-slider" class="slider" type="range" min="0" max="100" value="0" step="1" aria-label="发现滑块">
          <div class="btn-row">
            <button class="btn" id="step-back" type="button">算剩余</button>
            <button class="btn" id="step-next" type="button">算平均</button>
            <button class="btn secondary" id="jump-half" type="button">看结果</button>
            <button class="btn ghost" id="reset-all" type="button">重置</button>
          </div>
          <div class="meter">
            <div class="meter-num" id="discovery-number">${Number.isFinite(totalValue) ? `${totalValue} 千克` : '0'}</div>
            <div class="meter-sub" id="discovery-summary">先看总量，再减去已吃，再平均分配</div>
          </div>
        </div>
      </div>
      <div class="visual">
        <div class="box">
          <div class="kv">变化画面</div>
          <div class="progress"><span id="progress-bar"></span></div>
          <div class="meter-sub" id="progress-text">当前进度 0%</div>
        </div>
        <div class="box">
          <div class="kv">关键数据</div>
          <div class="chip-row">
            ${derivedSummaryItems.length ? derivedSummaryItems.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('') : '<span class="chip">请先看题目中的数量关系</span>'}
          </div>
        </div>
        <div class="box">
          <div class="kv">发现线索</div>
          <div class="chip-row">
            ${discoveryHints.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}
          </div>
        </div>
        <div class="box">
          <div class="kv">核心发现</div>
          <div class="core hidden" id="core-box">${escapeHtml(coreDiscovery || '核心发现待显示')}</div>
          <div class="btn-row" style="margin-top:10px">
            <button class="btn secondary" id="toggle-core" type="button">显示核心发现</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="card">
    <div class="section-title">3. 挑战区</div>
    <div class="stage">
      <div class="box">
        <div class="kv">挑战步骤</div>
        <div class="step-list">
          ${challengeSteps.length ? challengeSteps.map((item, index) => `<div class="step">${index + 1}. ${escapeHtml(item)}</div>`).join('') : '<div class="step">1. 先观察，再计算，再验证。</div>'}
        </div>
      </div>

      <div class="box">
        <div class="kv">输入验证</div>
        <input id="verify-input" class="input" type="text" placeholder="请输入你的答案" autocomplete="off">
        <div class="btn-row" style="margin-top:10px">
          <button class="btn" id="verify-btn" type="button">验证</button>
          <button class="btn secondary" id="show-answer-btn" type="button"${hasAnswer ? '' : ' disabled'}>显示答案</button>
          <button class="btn ghost" id="reset-challenge" type="button">重置</button>
        </div>
        <div class="feedback" id="verify-feedback">先拖动，后验证。</div>
        <div class="feedback good" id="answer-box" style="display:none;margin-top:10px"></div>
      </div>
    </div>
  </section>
</div>
<script>
(function(){
  var slider = document.getElementById('discovery-slider');
  var progressBar = document.getElementById('progress-bar');
  var progressText = document.getElementById('progress-text');
  var discoveryNumber = document.getElementById('discovery-number');
  var discoverySummary = document.getElementById('discovery-summary');
  var modePill = document.getElementById('mode-pill');
  var stepPill = document.getElementById('step-pill');
  var progressPill = document.getElementById('progress-pill');
  var stepBack = document.getElementById('step-back');
  var stepNext = document.getElementById('step-next');
  var jumpHalf = document.getElementById('jump-half');
  var resetAll = document.getElementById('reset-all');
  var toggleCore = document.getElementById('toggle-core');
  var coreBox = document.getElementById('core-box');
  var verifyInput = document.getElementById('verify-input');
  var verifyBtn = document.getElementById('verify-btn');
  var showAnswerBtn = document.getElementById('show-answer-btn');
  var resetChallenge = document.getElementById('reset-challenge');
  var verifyFeedback = document.getElementById('verify-feedback');
  var answerBox = document.getElementById('answer-box');
  var coreVisible = false;
  var steps = [
    '先看总量和已吃数量',
    '算出剩余大米',
    '平均分到 15 天',
    '验证每天吃多少'
  ];
  var startNumber = ${JSON.stringify(startNumber)};
  var targetNumber = ${JSON.stringify(targetNumber)};
  var maxNumber = ${JSON.stringify(maxNumber)};
  var answerText = ${JSON.stringify(derivedAnswerText)};
  var answerValue = ${JSON.stringify(answerValue)};
  var answerUnit = ${JSON.stringify(answerUnit)};
  var verificationTarget = ${JSON.stringify(verificationTarget)};
  var remainingValue = ${JSON.stringify(remainingValue)};
  var averageValue = ${JSON.stringify(averageValue)};
  function esc(text){
    return String(text || '').replace(/[&<>"']/g, function(s){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s];
    });
  }
  function compact(text){
    return String(text || '').replace(/\\s+/g, '').toLowerCase();
  }
  function currentStepIndex(){
    return Math.min(3, Math.floor((Number(slider.value || 0) / 100) * 4));
  }
  function currentValue(){
    var percent = Number(slider.value || 0) / 100;
    if (Number.isFinite(remainingValue) && Number.isFinite(averageValue)) {
      if (percent < 0.45) return startNumber
      if (percent < 0.8) return remainingValue
      return averageValue
    }
    return Math.round(startNumber + (targetNumber - startNumber) * percent);
  }
  function render(){
    var percent = Number(slider.value || 0);
    var stageIndex = currentStepIndex();
    var value = currentValue();
    progressBar.style.width = percent + '%';
    progressText.textContent = '当前进度 ' + percent + '%';
    discoveryNumber.textContent = String(value) + (answerUnit ? (' ' + answerUnit) : '');
    discoverySummary.textContent = percent < 25
      ? '先观察总量和已吃数量'
      : percent < 50
        ? '先减去已吃部分，得到剩余量'
      : percent < 75
          ? '把剩余量平均分到 15 天'
          : '已经可以验证最终答案';
    modePill.textContent = percent < 45 ? '先算剩余' : percent < 80 ? '再平均分' : '看答案';
    stepPill.textContent = '第 ' + (stageIndex + 1) + ' 步';
    progressPill.textContent = percent >= 75 ? '接近答案' : '探索中';
    progressPill.className = percent >= 75 ? 'stage-pill active' : 'stage-pill';
    stepBack.disabled = percent <= 0;
    stepNext.disabled = percent >= 100;
    if (coreBox) {
      coreBox.style.display = coreVisible ? 'block' : 'none';
    }
  }
  function setFeedback(text, tone){
    verifyFeedback.className = tone ? ('feedback ' + tone) : 'feedback';
    verifyFeedback.textContent = text;
  }
  function matchesAnswer(input){
    var value = compact(input);
    var expected = compact(answerText || verificationTarget || answerValue);
    if (!expected) return value.length > 0;
    if (value === expected || value.includes(expected) || expected.includes(value)) return true;
    var inputNums = value.match(/-?\\d+(?:\\.\\d+)?/g) || [];
    var expectedNums = expected.match(/-?\\d+(?:\\.\\d+)?/g) || [];
    if (inputNums.length && expectedNums.length) {
      return inputNums.join(',') === expectedNums.join(',');
    }
    return false;
  }
  slider.addEventListener('input', render);
  stepBack.addEventListener('click', function(){ slider.value = String(Math.max(0, Number(slider.value || 0) - 25)); render(); });
  stepNext.addEventListener('click', function(){ slider.value = String(Math.min(100, Number(slider.value || 0) + 25)); render(); });
  jumpHalf.addEventListener('click', function(){ slider.value = '50'; render(); });
  resetAll.addEventListener('click', function(){
    slider.value = '0';
    if (verifyInput) verifyInput.value = '';
    coreVisible = false;
    setFeedback('先拖动，后验证。');
    if (answerBox) answerBox.style.display = 'none';
    render();
  });
  toggleCore.addEventListener('click', function(){
    coreVisible = !coreVisible;
    toggleCore.textContent = coreVisible ? '隐藏核心发现' : '显示核心发现';
    render();
  });
  verifyBtn.addEventListener('click', function(){
    var value = verifyInput ? verifyInput.value : '';
    if (!String(value || '').trim()) {
      setFeedback('先输入答案再验证。', 'bad');
      return;
    }
    if (matchesAnswer(value)) {
      setFeedback('正确！你已经找到答案。', 'good');
      coreVisible = true;
      toggleCore.textContent = '隐藏核心发现';
      if (answerBox) {
        answerBox.style.display = 'block';
        answerBox.textContent = '答案：' + (answerText || answerValue || verificationTarget || '');
      }
      render();
      return;
    }
    setFeedback('还差一点，再看一眼发现区。', 'bad');
  });
  showAnswerBtn.addEventListener('click', function(){
    if (answerBox) {
      answerBox.style.display = 'block';
      answerBox.textContent = '答案：' + (answerText || answerValue || verificationTarget || '暂无');
    }
    setFeedback('标准答案已经显示。', 'good');
    coreVisible = true;
    toggleCore.textContent = '隐藏核心发现';
    render();
  });
  resetChallenge.addEventListener('click', function(){
    if (verifyInput) verifyInput.value = '';
    if (answerBox) answerBox.style.display = 'none';
    setFeedback('先拖动，后验证。');
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'ArrowLeft') { slider.value = String(Math.max(0, Number(slider.value || 0) - 5)); render(); }
    if (e.key === 'ArrowRight') { slider.value = String(Math.min(100, Number(slider.value || 0) + 5)); render(); }
  });
  if (verifyInput) {
    verifyInput.addEventListener('keydown', function(e){
      if (e.key === 'Enter') verifyBtn.click();
    });
  }
  render();
})();
</script>
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
            layout_component: 'TwoColumnLayout',
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
            maxTokens: 12000,
            timeoutSeconds: 60,
          })
          let analysisJson = buildHeuristicFallbackAnalysis(
            question.question_text,
            fallbackTypeContext.coreDiscovery || questionCoreDiscovery || questionTypeName || ''
          )
          if (fallbackAnalysis.success && fallbackAnalysis.content) {
            const parsedFallbackAnalysis = parseAnalysisJson(fallbackAnalysis.content)
            if (parsedFallbackAnalysis && typeof parsedFallbackAnalysis === 'object') {
              analysisJson = {
                ...analysisJson,
                ...parsedFallbackAnalysis,
              }
            }
          } else {
            console.warn('[generate/demo] fallback AI analysis failed, using heuristic analysis', fallbackAnalysis.error)
          }

          const renderPlan = buildRenderPlan(fallbackTypeContext, analysisJson, question.question_text)
          await patchQuestionFull(actualQuestionId, {
            core_discovery: fallbackTypeContext.coreDiscovery || questionCoreDiscovery || questionTypeName || '暂未分类',
            analysis_json: analysisJson,
            status: 'pending',
          })

          const generationResult = await consumeGeneration(question.user_id)
          if (!generationResult.success) {
            await recordGenerationArtifacts({
              headers,
              supabaseUrl: SUPABASE_URL,
              runId: generationRunId,
              questionId: actualQuestionId,
              typeContext: fallbackTypeContext,
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

          // 使用本地静态模板渲染，避免 temp 分支再依赖页面脚本
          const fallbackHtml = buildStaticFallbackHtml(question.question_text, analysisJson, renderPlan)
          const dataUrl = await saveHtmlToStorage(fallbackHtml, actualQuestionId)

          // 标记为 completed：只要 HTML 已成功存储，就不要再因为后续附加步骤把状态拉回 pending
          await patchQuestionFull(actualQuestionId, {
            question_type: '暂未分类',
            status: 'completed',
          }).catch((e) => {
            console.warn('[generate/demo] fallback completed patch failed', e.message)
          })

          let demo = {}
          try {
            const demoRes = await fetch(`${SUPABASE_URL}/rest/v1/question_demos`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                question_id: actualQuestionId,
                html_url: dataUrl,
                title: `演示 ${Date.now().toString().slice(-4)}`,
              }),
            })
            if (demoRes.ok) {
              const demos = await demoRes.json()
              demo = demos?.[0] || {}
            } else {
              const demoErr = await demoRes.text().catch(() => '')
              console.warn('[generate/demo] fallback question_demos insert failed', demoRes.status, demoErr.slice(0, 200))
            }
          } catch (e) {
            console.warn('[generate/demo] fallback question_demos insert exception', e.message)
          }

          await recordGenerationArtifacts({
            headers,
            supabaseUrl: SUPABASE_URL,
            runId: generationRunId,
            questionId: actualQuestionId,
            typeContext: fallbackTypeContext,
            analysisJson,
            renderPlan,
            status: 'partial',
            htmlUrl: dataUrl,
            demoId: demo.id,
          })
          return res.status(200).json({
            success: true,
            demoId: demo.id || null,
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
              layout_component: 'TwoColumnLayout',
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
              layout: { name: 'TwoColumnLayout', source: 'no_fallback_prompt' },
              controls: [],
              visuals: [],
              animations: [],
              assets: [],
              rules: {},
              fallbackStrategy: {},
              matchedComponents: { layout: [], controls: [], visuals: [], animations: [], assets: [] },
              missingComponents: [{ category: 'layout', name: 'TwoColumnLayout', reason: '未找到配置 temp 兜底 prompt', fallback: 'TwoColumnLayout' }],
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
            maxTokens: 12000,
            timeoutSeconds: 60,
          })
          if (!analysisResult.success) {
            console.warn('[generate/demo] matched analysis AI failed, using heuristic analysis', analysisResult.error)
            analysisJson = buildHeuristicFallbackAnalysis(
              question.question_text,
              typeContext.coreDiscovery || questionCoreDiscovery || questionTypeName || ''
            )
          } else {
            const parsedAnalysisJson = parseAnalysisJson(analysisResult.content)
            analysisJson = parsedAnalysisJson && typeof parsedAnalysisJson === 'object'
              ? parsedAnalysisJson
              : buildHeuristicFallbackAnalysis(
                  question.question_text,
                  typeContext.coreDiscovery || questionCoreDiscovery || questionTypeName || ''
                )
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

    if (!renderPlan) {
      renderPlan = buildRenderPlan(typeContext, analysisJson, question.question_text)
    }

    // 直接走本地模板组装 HTML，不再进入 AI 现写整页 HTML 的慢路径
    {
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

      const htmlContent = buildStaticFallbackHtml(question.question_text, analysisJson, renderPlan)
      const dataUrl = await saveHtmlToStorage(htmlContent, actualQuestionId)
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

      // 清理 HTML：只保留 DOCTYPE~html 之间的内容
      const startIdx = htmlResult.content.search(/<!DOCTYPE\s+html|<html[^>]*>/i)
      const rawHtml = startIdx === -1 ? htmlResult.content.trim() : htmlResult.content.slice(startIdx).trim()
      const htmlEnd = rawHtml.search(/<\/html>\s*/i)
      htmlContent = htmlEnd !== -1 ? rawHtml.slice(0, htmlEnd + '<\/html>'.length) : rawHtml
      if (!looksLikeHtmlDocument(htmlContent) || htmlContent.length < 800) {
        console.warn('[generate/demo] AI HTML output too short or invalid, falling back to static template')
        htmlContent = buildStaticFallbackHtml(question.question_text, analysisJson, renderPlan)
      }
    } else {
      // 含占位符 → 字符串替换（兼容旧版或内置模板）
      htmlContent = htmlTemplate
        .replace(/\$\{analysis_json\}/g, () => analysisJsonStr)
        .replace(/\$\{render_json\}/g, () => renderPlanStr)
        .replace(/\$\{question_text\}/g, () => question.question_text)
      if (!looksLikeHtmlDocument(htmlContent) || htmlContent.length < 800) {
        console.warn('[generate/demo] template output too short or invalid, falling back to static template')
        htmlContent = buildStaticFallbackHtml(question.question_text, analysisJson, renderPlan)
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
