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

function stripJsonComments(text) {
  const input = safeText(text)
  if (!input) return ''

  let output = ''
  let inString = false
  let stringQuote = ''

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    const nextChar = input[i + 1]

    if (inString) {
      output += char
      if (char === '\\') {
        i += 1
        if (i < input.length) {
          output += input[i]
        }
        continue
      }
      if (char === stringQuote) {
        inString = false
        stringQuote = ''
      }
      continue
    }

    if (char === '"' || char === '\'') {
      inString = true
      stringQuote = char
      output += char
      continue
    }

    if (char === '/' && nextChar === '/') {
      while (i < input.length && input[i] !== '\n') {
        i += 1
      }
      if (i < input.length) {
        output += '\n'
      }
      continue
    }

    if (char === '/' && nextChar === '*') {
      i += 2
      while (i < input.length - 1 && !(input[i] === '*' && input[i + 1] === '/')) {
        i += 1
      }
      i += 1
      continue
    }

    output += char
  }

  return output
}

function parseJsonText(value, fallback = null) {
  if (value && typeof value === 'object') {
    return value
  }
  const text = safeText(value)
  if (!text) return fallback
  try {
    return JSON.parse(text)
  } catch {
    const stripped = stripJsonComments(text)
    if (!stripped || stripped === text) {
      return fallback
    }
    try {
      return JSON.parse(stripped)
    } catch {
      return fallback
    }
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
      componentProps: row?.component_props ?? null,
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
  let promptValue = configValue
  if (context.jsonSchema !== undefined) {
    const schemaText = JSON.stringify(context.jsonSchema, null, 2)
    promptValue = promptValue.replaceAll('{{json_schema}}', schemaText)
  }

  const sections = [
    promptValue,
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
    sections.push(
      '',
      'logic_types 表候选列表（只需要用于选择最匹配的类型，不要输出这些内容）：',
      JSON.stringify(
        context.logicTypes.map((item) => ({
          name: item.name,
          math_component: item.mathComponent,
        })),
        null,
        2,
      ),
    )
    sections.push(
      '',
      '要求：从候选中选择 1 个最匹配的 logic_type.name，并输出它对应的 logic_type.math_component 到 component 字段。',
    )
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

const ALLOWED_MATH_OPERATION_TYPES = new Set(['加', '减', '乘', '除以', '除'])

function validateMathAnalysis(mathAnalysis) {
  if (!Array.isArray(mathAnalysis?.known_conditions)) {
    return { ok: false, message: 'math_analysis.known_conditions 必须是数组' }
  }
  if (!Array.isArray(mathAnalysis?.hidden_conditions)) {
    return { ok: false, message: 'math_analysis.hidden_conditions 必须是数组' }
  }
  if (!mathAnalysis?.goal || typeof mathAnalysis.goal !== 'object' || Array.isArray(mathAnalysis.goal)) {
    return { ok: false, message: 'math_analysis.goal 必须是对象' }
  }

  for (let index = 0; index < mathAnalysis.known_conditions.length; index += 1) {
    const condition = mathAnalysis.known_conditions[index]
    if (!safeText(condition?.name)) {
      return { ok: false, message: `known_conditions 第 ${index + 1} 项的 name 不能为空` }
    }
    if (condition?.value !== null && !Number.isFinite(condition?.value)) {
      return { ok: false, message: `known_conditions 第 ${index + 1} 项的 value 必须是数字或 null` }
    }
    if (typeof condition?.unit !== 'string') {
      return { ok: false, message: `known_conditions 第 ${index + 1} 项的 unit 必须是字符串` }
    }
  }

  for (let index = 0; index < mathAnalysis.hidden_conditions.length; index += 1) {
    if (!safeText(mathAnalysis.hidden_conditions[index]?.text)) {
      return { ok: false, message: `hidden_conditions 第 ${index + 1} 项的 text 不能为空` }
    }
  }

  if (!safeText(mathAnalysis.goal.text) || !safeText(mathAnalysis.goal.target)) {
    return { ok: false, message: 'math_analysis.goal.text 和 goal.target 不能为空' }
  }

  const stages = Array.isArray(mathAnalysis?.logic_stages) ? mathAnalysis.logic_stages : []
  if (stages.length === 0) {
    return { ok: false, message: 'math_analysis.logic_stages 不能为空' }
  }

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]
    const expectedStep = index + 1
    if (stage?.step !== expectedStep) {
      return { ok: false, message: `logic_stages 第 ${expectedStep} 项的 step 必须等于 ${expectedStep}` }
    }
    if (!ALLOWED_MATH_OPERATION_TYPES.has(safeText(stage?.type))) {
      return {
        ok: false,
        message: `logic_stages 第 ${expectedStep} 项的 type 非法，只允许：加、减、乘、除以、除`,
      }
    }
    if (!safeText(stage?.formula_tag)) {
      return { ok: false, message: `logic_stages 第 ${expectedStep} 项的 formula_tag 不能为空` }
    }

    if (!Array.isArray(stage?.math_object)) {
      return { ok: false, message: `logic_stages 第 ${expectedStep} 项的 math_object 必须是数组` }
    }
    const mathObjects = stage.math_object

    for (let objectIndex = 0; objectIndex < mathObjects.length; objectIndex += 1) {
      const mathObject = mathObjects[objectIndex]
      const expectedOrder = objectIndex + 1
      if (mathObject?.order !== expectedOrder) {
        return {
          ok: false,
          message: `logic_stages 第 ${expectedStep} 项 math_object[${objectIndex}] 的 order 必须等于 ${expectedOrder}`,
        }
      }
      if (!safeText(mathObject?.name)) {
        return { ok: false, message: `logic_stages 第 ${expectedStep} 项的 math_object.name 不能为空` }
      }
      if (!Number.isFinite(mathObject?.value)) {
        return { ok: false, message: `logic_stages 第 ${expectedStep} 项的 math_object.value 必须是数字` }
      }
      if (typeof mathObject?.unit !== 'string') {
        return { ok: false, message: `logic_stages 第 ${expectedStep} 项的 math_object.unit 必须是字符串` }
      }
    }

    const stepAnswer = stage?.step_answer
    if (!stepAnswer || typeof stepAnswer !== 'object' || Array.isArray(stepAnswer)) {
      return { ok: false, message: `logic_stages 第 ${expectedStep} 项缺少 step_answer` }
    }
    if (!Number.isFinite(stepAnswer.value)) {
      return { ok: false, message: `logic_stages 第 ${expectedStep} 项的 step_answer.value 必须是数字` }
    }
    if (typeof stepAnswer.unit !== 'string') {
      return { ok: false, message: `logic_stages 第 ${expectedStep} 项的 step_answer.unit 必须是字符串` }
    }
    if (!safeText(stepAnswer.name)) {
      return { ok: false, message: `logic_stages 第 ${expectedStep} 项的 step_answer.name 不能为空` }
    }
  }

  return { ok: true }
}

async function runStrictMathAnalysis(questionText) {
  let lastError = null

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await runAnalysisStep({
        configKey: 'math_analysis',
        questionText,
        context: {},
      })
      const validation = validateMathAnalysis(result)
      if (validation.ok) return result
      lastError = new Error(validation.message || 'math_analysis 结构不合法')
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('math_analysis 生成失败')
}

function normalizeLogicAnalysis(result, logicTypes) {
  const blocks = Array.isArray(result?.logic_blocks) ? result.logic_blocks : []
  const byComponent = new Map(logicTypes.map((item) => [item.mathComponent, item]))
  const normalizedBlocks = blocks
    .map((block) => {
      const rawComponent = safeText(block?.component)
      const matched = byComponent.get(rawComponent)

      if (matched) {
        return {
          component: matched.mathComponent,
          math_object: safeText(block?.math_object),
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
  const allowedComponents = new Set(logicTypes.map((item) => item.mathComponent))
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
    const component = safeText(block?.component)
    if (!allowedComponents.has(component)) {
      return {
        ok: false,
        kind: 'component',
        index,
        step: block?.step ?? index + 1,
        component,
        message: `第 ${block?.step ?? index + 1} 步的 component 非法：${component || '空'}`,
      }
    }

    const mathObject = safeText(block?.math_object)
    if (!mathObject) {
      return {
        ok: false,
        kind: 'math_object',
        index,
        step: block?.step ?? index + 1,
        component,
        message: `第 ${block?.step ?? index + 1} 步的 math_object 不能为空`,
      }
    }
  }

  return {
    ok: true,
  }
}

function getComponentSchemaFromLogicAnalysis(logicAnalysisJson, logicTypes) {
  const blocks = Array.isArray(logicAnalysisJson?.logic_blocks) ? logicAnalysisJson.logic_blocks : []
  const componentName = safeText(blocks.map((block) => block?.component).find((item) => safeText(item)))
  if (!componentName) {
    throw new Error('logic_analysis_json 中没有可用的 component，无法生成 component_analysis')
  }

  const matched = logicTypes.find((item) => item.mathComponent === componentName)
  if (!matched) {
    throw new Error(`logic_types 中找不到 component = ${componentName} 对应的配置`)
  }

  const schema = parseJsonText(matched.componentProps)
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error(`logic_types.${componentName} 的 component_props 不是合法 JSON 对象`)
  }

  return schema
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
            name: item.name,
            mathComponent: item.mathComponent,
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
    const mathAnalysisJson = await runStrictMathAnalysis(questionText)
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
        jsonSchema: getComponentSchemaFromLogicAnalysis(logicAnalysisJson, logicTypes),
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
