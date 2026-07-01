import { query, insert, updateWhere } from '../../server/lib/supabase-admin.js'
import { consumeGeneration } from '../../server/lib/membership.js'
import { deepseekJson, isDeepSeekConfigured } from '../../server/lib/deepseek.js'
import { getSupabaseEnv } from '../../server/lib/supabase-env.js'

function toObject(value) {
  if (value !== null && typeof value === 'object') return value
  return { value }
}

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

async function getLogicTypes() {
  const { data, error } = await query('logic_types', {
    select: 'name,math_component,component_props',
    order: 'name',
    ascending: true,
  })
  if (error) throw new Error(`读取 logic_types 失败: ${error}`)

  const list = (data || [])
    .map((row) => ({
      name: safeText(row?.name),
      mathComponent: safeText(row?.math_component),
      componentProps: safeText(row?.component_props),
    }))
    .filter((item) => item.name && item.mathComponent)

  if (list.length === 0) {
    throw new Error('logic_types 表为空，无法生成 logic_analysis')
  }

  return list
}

function parseComponentPropKeys(componentPropsText) {
  const text = safeText(componentPropsText)
  if (!text) return []

  const candidates = [
    text,
    `{${text}}`,
    text.replace(/^\{([\s\S]*)\}$/, '$1'),
  ]

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => safeText(item)).filter(Boolean)
      }
      if (parsed && typeof parsed === 'object') {
        return Object.keys(parsed).filter(Boolean)
      }
    } catch {
      // continue
    }
  }

  const keyMatches = [...text.matchAll(/["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?\s*:/g)]
    .map((match) => safeText(match[1]))
    .filter(Boolean)

  if (keyMatches.length > 0) {
    return Array.from(new Set(keyMatches))
  }

  return text
    .split(/[,，、\n\r\t;；|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildPrompt(configValue, questionText, context = {}) {
  const sections = [
    configValue,
    '',
    '题目原文：',
    questionText,
  ]

  if (context.mathAnalysisJson) {
    sections.push('', 'math_analysis_json：', JSON.stringify(context.mathAnalysisJson, null, 2))
  }

  if (context.logicAnalysisJson) {
    sections.push('', 'logic_analysis_json：', JSON.stringify(context.logicAnalysisJson, null, 2))
  }

  if (context.tutorAnalysisJson) {
    sections.push('', 'tutor_analysis_json：', JSON.stringify(context.tutorAnalysisJson, null, 2))
  }

  if (context.logicTypes) {
    sections.push('', 'logic_types 表候选列表：', JSON.stringify(context.logicTypes, null, 2))
    sections.push('', '允许的 type 值（只能从下面选择，必须原样返回）：', context.logicTypes.map((item) => item.name).join(' | '))
    sections.push('', '每个 logic_type 对应的 component_props（必须严格遵守，props 的 key 只能来自这里）：', JSON.stringify(
      context.logicTypes.map((item) => ({
        name: item.name,
        math_component: item.mathComponent,
        component_props: item.componentProps,
        component_props_keys: item.componentPropsKeys,
      })),
      null,
      2,
    ))
  }

  sections.push('', '要求：只输出 JSON，不要输出 markdown、解释或多余文本。')
  return sections.join('\n')
}

async function runAnalysisStep({
  configKey,
  questionText,
  context,
}) {
  const prompt = await getConfigValue(configKey)
  if (!prompt) {
    throw new Error(`configs 中缺少 key = ${configKey} 的配置`)
  }

  const result = await deepseekJson({
    systemPrompt: '你是一个严格输出 JSON 的数学教育分析助手。请只返回 JSON 对象。',
    userPrompt: buildPrompt(prompt, questionText, context),
    temperature: 0.2,
  })

  return toObject(result)
}

function normalizeLogicAnalysis(result, logicTypes) {
  const blocks = Array.isArray(result?.logic_blocks) ? result.logic_blocks : []
  const byName = new Map(logicTypes.map((item) => [item.name, item]))
  const byComponent = new Map(logicTypes.map((item) => [item.mathComponent, item]))
  const normalizedBlocks = blocks
    .map((block) => {
      const rawType = safeText(block?.type)
      const rawComponent = safeText(block?.component)
      const matched = byName.get(rawType) || byComponent.get(rawComponent)
      const rawProps = block && typeof block === 'object' && !Array.isArray(block) ? block.props : undefined
      let props = {}

      if (rawProps && typeof rawProps === 'object' && !Array.isArray(rawProps)) {
        props = rawProps
      } else if (typeof rawProps === 'string') {
        try {
          const parsed = JSON.parse(rawProps)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            props = parsed
          }
        } catch {
          const parsed = parseComponentPropKeys(rawProps)
          if (parsed.length > 0) {
            props = Object.fromEntries(parsed.map((key) => [key, null]))
          }
        }
      }

      if (matched) {
        return {
          ...block,
          type: matched.name,
          component: matched.mathComponent,
          props,
        }
      }

      return null
    })
    .filter(Boolean)

  return {
    ...result,
    logic_blocks: normalizedBlocks,
  }
}

function validateLogicAnalysis(logicAnalysis, logicTypes) {
  const allowed = new Set(logicTypes.map((item) => item.name))
  const byName = new Map(logicTypes.map((item) => [item.name, item]))
  const blocks = Array.isArray(logicAnalysis?.logic_blocks) ? logicAnalysis.logic_blocks : []
  if (blocks.length === 0) {
    return {
      ok: false,
      kind: 'structure',
      message: 'logic_analysis 中没有 logic_blocks',
    }
  }

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    const type = safeText(block?.type)
    if (!allowed.has(type)) {
      return {
        ok: false,
        kind: 'type',
        index,
        step: block?.step ?? index + 1,
        type,
        message: `第 ${block?.step ?? index + 1} 步的 type 非法：${type || '空'}`,
      }
    }

    const matched = byName.get(type)
    const expectedKeys = parseComponentPropKeys(matched?.componentProps)
    const props = block?.props
    if (expectedKeys.length === 0) {
      if (props && typeof props === 'object' && !Array.isArray(props)) continue
      return {
        ok: false,
        kind: 'props',
        index,
        step: block?.step ?? index + 1,
        type,
        expectedKeys,
        actualKeys: [],
        message: `第 ${block?.step ?? index + 1} 步的 props 不是对象`,
      }
    }

    if (!props || typeof props !== 'object' || Array.isArray(props)) {
      return {
        ok: false,
        kind: 'props',
        index,
        step: block?.step ?? index + 1,
        type,
        expectedKeys,
        actualKeys: [],
        message: `第 ${block?.step ?? index + 1} 步的 props 不是对象`,
      }
    }

    const actualKeys = Object.keys(props)
    if (actualKeys.length !== expectedKeys.length || !expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(props, key))) {
      return {
        ok: false,
        kind: 'props',
        index,
        step: block?.step ?? index + 1,
        type,
        expectedKeys,
        actualKeys,
        message: `第 ${block?.step ?? index + 1} 步的 props 字段不匹配`,
      }
    }
  }

  return {
    ok: true,
  }
}

async function runStrictLogicAnalysis(questionText, mathAnalysisJson, logicTypes) {
  const allowedNames = logicTypes.map((item) => item.name)
  let lastError = null

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const raw = await runAnalysisStep({
        configKey: 'logic_analysis',
        questionText,
        context: {
          mathAnalysisJson,
          logicTypes: logicTypes.map((item) => ({
            ...item,
            componentPropsKeys: parseComponentPropKeys(item.componentProps),
          })),
        },
      })

      const normalized = normalizeLogicAnalysis(raw, logicTypes)
      const validation = validateLogicAnalysis(normalized, logicTypes)
      if (validation.ok) {
        return normalized
      }

      if (validation.kind === 'props') {
        lastError = new Error(
          `${validation.message}，要求字段：${validation.expectedKeys.join(', ') || '无'}，实际字段：${validation.actualKeys.join(', ') || '无'}`,
        )
      } else if (validation.kind === 'type') {
        lastError = new Error(`logic_analysis 输出包含非法 type：${validation.type || '空'}，允许值只有：${allowedNames.join(', ')}`)
      } else {
        lastError = new Error(validation.message || 'logic_analysis 结构不合法')
      }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('logic_analysis 生成失败')
}

function normalizeBody(body) {
  if (!body) return {}
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return { questionText: body }
    }
  }
  return body
}

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!isDeepSeekConfigured()) {
    res.status(500).json({ error: 'DeepSeek 未配置' })
    return
  }

  try {
    const body = normalizeBody(req.body)
    const questionText = safeText(body.questionText)
    if (!questionText) {
      res.status(400).json({ error: '缺少 questionText' })
      return
    }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '未登录' })
      return
    }

    const userData = await getCurrentUser(authHeader)
    const userId = userData.id

    // 1) 基础判定：是不是数学题
    const classification = await deepseekJson({
      systemPrompt: '你是数学题审核器。只判断输入是否为数学题，输出 JSON：{"is_math": true/false, "reason": "简短原因"}。如果是数学应用题、方程题、几何题、计算题、统计题都算数学题。',
      userPrompt: `请判断下面内容是否为数学题：\n\n${questionText}`,
      temperature: 0,
    })

    const isMath = Boolean(
      classification?.is_math === true
      || classification?.isMath === true
      || classification?.result === 'math'
      || classification?.label === 'math'
    )

    if (!isMath) {
      res.status(400).json({
        error: '请上传正确的内容',
        notMath: true,
        reason: classification?.reason || '',
      })
      return
    }

    // 2) 扣除次数：数学题确认并开始正式生成后才扣
    const quota = await consumeGeneration(userId)
    if (!quota.success) {
      res.status(400).json({
        error: quota.error === 'quota_exceeded' || quota.error === 'no_quota'
          ? '当前套餐没有可用的生成次数'
          : '生成次数不足',
        quotaError: quota.error,
      })
      return
    }

    // 3) 先落库，后续每一步分析都写回同一条 user_questions
    const questionInsert = await insert('user_questions', {
      user_id: userId,
      question_text: questionText,
      status: 'pending',
      question_type: '数学题',
      core_discovery: '',
      analysis_json: {},
      math_analysis_json: {},
      logic_analysis_json: {},
      tutor_analysis_json: {},
      component_analysis_json: {},
    })

    if (questionInsert.error || !questionInsert.data || questionInsert.data.length === 0) {
      res.status(500).json({ error: '落库失败', detail: questionInsert.error })
      return
    }

    const question = questionInsert.data[0]

    // 4) 依次生成四个 JSON，并逐步回写
    const mathAnalysisJson = await runAnalysisStep({
      configKey: 'math_analysis',
      questionText,
      context: {},
    })
    await updateWhere('user_questions', { id: question.id }, {
      math_analysis_json: mathAnalysisJson,
      analysis_json: mathAnalysisJson,
    })

    const logicTypes = await getLogicTypes()
    const logicAnalysisJson = await runStrictLogicAnalysis(questionText, mathAnalysisJson, logicTypes)
    await updateWhere('user_questions', { id: question.id }, {
      logic_analysis_json: logicAnalysisJson,
    })

    const tutorAnalysisJson = await runAnalysisStep({
      configKey: 'tutor_analysis',
      questionText,
      context: { mathAnalysisJson, logicAnalysisJson },
    })
    await updateWhere('user_questions', { id: question.id }, {
      tutor_analysis_json: tutorAnalysisJson,
    })

    const componentAnalysisJson = await runAnalysisStep({
      configKey: 'component_analysis',
      questionText,
      context: {
        mathAnalysisJson,
        logicAnalysisJson,
        tutorAnalysisJson,
      },
    })
    await updateWhere('user_questions', { id: question.id }, {
      component_analysis_json: componentAnalysisJson,
      status: 'completed',
    })

    res.status(200).json({
      success: true,
      questionId: question.id,
      questionText,
      mathAnalysisJson,
      logicAnalysisJson,
      tutorAnalysisJson,
      componentAnalysisJson,
    })
  } catch (error) {
    console.error('[user-questions/submit] error:', error)
    res.status(500).json({
      error: error?.message || '题目上传失败',
    })
  }
}
