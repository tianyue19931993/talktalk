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
    select: 'name,math_component',
    order: 'name',
    ascending: true,
  })
  if (error) throw new Error(`读取 logic_types 失败: ${error}`)

  const list = (data || [])
    .map((row) => ({
      name: safeText(row?.name),
      mathComponent: safeText(row?.math_component),
    }))
    .filter((item) => item.name && item.mathComponent)

  if (list.length === 0) {
    throw new Error('logic_types 表为空，无法生成 logic_analysis')
  }

  return list
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

function buildLogicAnalysis(mathAnalysisJson, logicTypes) {
  const stages = Array.isArray(mathAnalysisJson?.logic_stages) ? mathAnalysisJson.logic_stages : []
  const logicTypeByName = new Map(logicTypes.map((item) => [item.name, item]))

  const logicBlocks = stages.map((stage, index) => {
    const step = String(stage?.step ?? index + 1)
    const type = safeText(stage?.type)
    const matched = logicTypeByName.get(type)

    if (!matched) {
      throw new Error(`logic_types 中找不到 name = ${type || '空'} 对应的 math_component`)
    }

    return {
      step,
      type,
      component: matched.mathComponent,
    }
  })

  if (logicBlocks.length === 0) {
    throw new Error('math_analysis_json.logic_stages 为空，无法生成 logic_analysis_json')
  }

  return { logic_blocks: logicBlocks }
}

function validateTutorAnalysis(tutorAnalysisJson, mathAnalysisJson) {
  const logicStages = Array.isArray(mathAnalysisJson?.logic_stages) ? mathAnalysisJson.logic_stages : []
  const challengeSteps = Array.isArray(tutorAnalysisJson?.challenge_steps)
    ? tutorAnalysisJson.challenge_steps
    : []

  if (challengeSteps.length !== logicStages.length) {
    return {
      ok: false,
      message: `tutor_analysis.challenge_steps 数量必须等于 logic_stages，期望 ${logicStages.length}，实际 ${challengeSteps.length}`,
    }
  }

  for (let index = 0; index < logicStages.length; index += 1) {
    const expectedStep = logicStages[index]?.step ?? index + 1
    const challengeStep = challengeSteps[index]
    if (String(challengeStep?.step ?? '') !== String(expectedStep)) {
      return { ok: false, message: `challenge_steps 第 ${index + 1} 项的 step 必须对应 ${expectedStep}` }
    }
    if (!safeText(challengeStep?.question)) {
      return { ok: false, message: `challenge_steps 第 ${index + 1} 项的 question 不能为空` }
    }
    if (!safeText(challengeStep?.hint)) {
      return { ok: false, message: `challenge_steps 第 ${index + 1} 项的 hint 不能为空` }
    }

    const guidanceText = `${challengeStep.question} ${challengeStep.hint}`
    if (/[0-9０-９]/.test(guidanceText)) {
      return { ok: false, message: `challenge_steps 第 ${index + 1} 项的 question/hint 不能包含具体数字` }
    }
    if (/[=＝×÷]/.test(guidanceText)) {
      return { ok: false, message: `challenge_steps 第 ${index + 1} 项的 question/hint 不能包含完整算式` }
    }
    if (/(结果是|等于|得到)/.test(guidanceText)) {
      return { ok: false, message: `challenge_steps 第 ${index + 1} 项包含暗示答案的表述` }
    }
  }

  return { ok: true }
}

async function runStrictTutorAnalysis(questionText, mathAnalysisJson, logicAnalysisJson) {
  let lastError = null

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await runAnalysisStep({
        configKey: 'tutor_analysis',
        questionText,
        context: {
          mathAnalysisJson,
          logicAnalysisJson,
          outputInstruction: '严格输出 JSON：{"challenge_steps":[{"step":1,"question":"","hint":""}]}',
        },
      })
      const validation = validateTutorAnalysis(result, mathAnalysisJson)
      if (validation.ok) return result
      lastError = new Error(validation.message || 'tutor_analysis 结构不合法')
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('tutor_analysis 生成失败')
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

    // 4) 生成 math/tutor，logic 由 math_analysis_json 通过代码映射得到
    const mathAnalysisJson = await runStrictMathAnalysis(questionText)
    await updateWhere('user_questions', { id: question.id }, {
      math_analysis_json: mathAnalysisJson,
      analysis_json: mathAnalysisJson,
    })

    const logicTypes = await getLogicTypes()
    const logicAnalysisJson = buildLogicAnalysis(mathAnalysisJson, logicTypes)
    await updateWhere('user_questions', { id: question.id }, {
      logic_analysis_json: logicAnalysisJson,
    })

    const tutorAnalysisJson = await runStrictTutorAnalysis(
      questionText,
      mathAnalysisJson,
      logicAnalysisJson,
    )
    await updateWhere('user_questions', { id: question.id }, {
      tutor_analysis_json: tutorAnalysisJson,
      status: 'completed',
    })

    res.status(200).json({
      success: true,
      questionId: question.id,
      questionText,
      mathAnalysisJson,
      logicAnalysisJson,
      tutorAnalysisJson,
    })
  } catch (error) {
    console.error('[user-questions/submit] error:', error)
    res.status(500).json({
      error: error?.message || '题目上传失败',
    })
  }
}
