/**
 * AI 调用工具层
 *
 * 当前预留 DeepSeek API 位置。
 * 使用方式：
 *   1. 在 Vercel Dashboard 配置 DEEPSEEK_API_KEY
 *   2. 可选：DEEPSEEK_BASE_URL（默认 https://api.deepseek.com）
 *   3. 调用 callAI() 即可
 */

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const DEEPSEEK_MODEL = 'deepseek-v4-pro'

/**
 * 调用 AI（当前为 DeepSeek Chat）
 *
 * 未配置 API Key 时返回 mock 数据，方便前端调试。
 * 配置 DEEPSEEK_API_KEY 后自动切换为真实调用。
 *
 * @param {Object} options
 * @param {string} options.prompt - 用户消息（主要输入）
 * @param {string} [options.systemPrompt] - 系统消息（角色设定 / prompt 模板）
 * @param {number} [options.temperature] - 温度，默认 0.7
 * @param {number} [options.maxTokens] - 最大输出 token，默认 4096
 * @param {string} [options.responseFormat] - 输出格式：text 或 json_object
 * @param {number} [options.timeoutSeconds] - 超时秒数（默认 7）
 */
export async function callAI(options) {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    console.warn('[AI] DEEPSEEK_API_KEY 未配置，使用 mock 模式')
    return mockAI(options)
  }

  const messages = []
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt })
  }
  messages.push({ role: 'user', content: options.prompt })

  const timeoutMs = (options.timeoutSeconds || 7) * 1000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        response_format: options.responseFormat === 'json_object'
          ? { type: 'json_object' }
          : undefined,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const err = await res.text()
      return { success: false, content: '', error: `AI API ${res.status}: ${err}` }
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    return { success: true, content }
  } catch (e) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') {
      return { success: false, content: '', error: 'AI 请求超时' }
    }
    return { success: false, content: '', error: e.message || 'AI call failed' }
  }
}

function mockAI(options) {
  const promptText = String(options.prompt || '')
  const systemText = String(options.systemPrompt || '')
  const questionText = extractQuestionText(promptText)
  const coreDiscovery = mockCoreDiscovery(questionText || promptText)

  if (options.responseFormat === 'json_object' || promptText.includes('严格按照以下 JSON')) {
    const analysis = buildMockAnalysisJson(questionText, coreDiscovery, promptText, systemText)
    return {
      success: true,
      content: JSON.stringify(analysis),
    }
  }

  if (promptText.includes('html_prompt') || promptText.includes('生成互动HTML')) {
    const color = ['#7928ca', '#0070f3', '#ff0080'][Math.floor(Math.random() * 3)]
    const safeQuestion = escapeHtml(questionText || '互动演示')
    return {
      success: true,
      content: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>互动演示</title>
<style>
body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;padding:20px;box-sizing:border-box}
.card{background:white;border-radius:24px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 2px 8px rgba(0,0,0,0.04);max-width:500px;width:100%;text-align:center}
h1{font-size:24px;color:#171717;margin:0 0 16px}
.display{font-size:48px;font-weight:bold;color:${color};margin:20px 0}
.step{text-align:left;margin:12px 0;padding:12px 16px;background:#f5f5f5;border-radius:12px;color:#4d4d4d;font-size:14px;line-height:1.6}
.footer{margin-top:24px;color:#888;font-size:12px}
</style>
</head>
<body>
<div class="card">
  <h1>📐 互动演示</h1>
  <div class="display">${safeQuestion}</div>
  <div class="step">📌 这是 mock 模式下的临时预览页</div>
  <div class="step">✏️ 请配置真实 DeepSeek API 后再看正式生成效果</div>
  <div class="step">✅ 当前页面不会再固定写死 3 米样例</div>
  <div class="footer">TalkTalk · AI 生成</div>
</div>
</html>`,
    }
  }

  return {
    success: true,
    content: JSON.stringify(buildMockAnalysisJson(questionText, coreDiscovery, promptText, systemText)),
  }
}

function extractQuestionText(prompt) {
  const text = String(prompt || '')
  const patterns = [
    /题目原文[：:\n]\s*([\s\S]*?)(?:\n\s*---|\n\s*请|\n\s*内容[：:])/,
    /题目[：:\n]\s*([\s\S]*?)(?:\n\s*---|\n\s*请|\n\s*内容[：:])/,
    /内容[：:\n]\s*([\s\S]*?)(?:\n\s*---|\n\s*请)/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return match[1].trim().split(/\n+/)[0].trim()
    }
  }
  return text.trim().split(/\n+/)[0].trim()
}

function buildMockAnalysisJson(questionText, coreDiscovery, promptText, systemText) {
  const text = String(questionText || promptText || '')
  const analysis = {
    question_type: coreDiscovery,
    known_conditions: [],
    hidden_conditions: [],
    verification_target: text || '待补充',
    core_discovery: coreDiscovery,
    discovery_flow: [],
    challenge_steps: [],
    interaction_flow: {
      trigger: '点击按钮',
      action: '根据题意触发变化',
      feedback: ['展示题目信息', '展示推理过程', '高亮答案'],
      reset: '重置后回到初始状态',
    },
    animation_flow: {
      type: coreDiscovery.includes('单位') ? '单位变化' : '步骤推进',
      description: '根据题意逐步展示变化过程',
      visual_effect: ['数值变化', '步骤高亮', '答案突出'],
      duration: '0.8s',
    },
    knowledge: '待识别',
    known_data: {},
    answer: {},
  }

  if (/(换算|单位|厘米|分米|毫米|千米)/.test(text) && /米|厘米|分米|毫米|千米/.test(text)) {
    const numMatch = text.match(/(\d+(?:\.\d+)?)\s*米/)
    const value = numMatch ? Number(numMatch[1]) : 0
    const toUnit = /厘米/.test(text) ? '厘米' : '米'
    const fromUnit = /米/.test(text) ? '米' : '长度单位'
    const answerValue = toUnit === '厘米' && fromUnit === '米' ? value * 100 : value
    analysis.question_type = coreDiscovery
    analysis.known_conditions = [text]
    analysis.hidden_conditions = ['需要统一单位后再比较或计算']
    analysis.verification_target = text
    analysis.discovery_flow = ['先观察题目中的单位', '再统一单位后计算', '最后得到答案']
    analysis.challenge_steps = ['先统一单位', '再进行计算', '得到最终结果']
    analysis.interaction_flow = {
      trigger: '点击换算按钮',
      action: '将题目中的量转换为统一单位',
      feedback: ['显示单位关系', '展示换算过程', '高亮答案'],
      reset: '重置后回到初始状态',
    }
    analysis.animation_flow = {
      type: '单位变化',
      description: '将数量逐步转换成统一单位',
      visual_effect: ['单位切换', '数值变化', '答案高亮'],
      duration: '0.8s',
    }
    analysis.knowledge = '长度单位换算'
    analysis.known_data = { value, from_unit: fromUnit, to_unit: toUnit }
    analysis.answer = { value: answerValue || value, unit: toUnit }
    return analysis
  }

  if (/工程|铺设|工作量|效率|每天.*?天.*?完工|要求.*?天完工/.test(text)) {
    const dayRate = text.match(/每天.*?(\d+(?:\.\d+)?)\s*米/)
    const totalDays = text.match(/(\d+)\s*天完成任务/)
    const targetDays = text.match(/要求\s*(\d+)\s*天完工/)
    const perDay = dayRate ? Number(dayRate[1]) : 0
    const originalDays = totalDays ? Number(totalDays[1]) : 0
    const target = targetDays ? Number(targetDays[1]) : 0
    const totalLength = perDay && originalDays ? perDay * originalDays : 0
    const answerValue = target ? Math.round(totalLength / target) : perDay
    analysis.question_type = coreDiscovery
    analysis.known_conditions = [
      dayRate && totalDays ? `每天铺${perDay}米，${originalDays}天完成任务` : text,
      target ? `要求${target}天完工` : '',
    ].filter(Boolean)
    analysis.hidden_conditions = ['总工作量不变', '先求出总长度，再除以新的天数']
    analysis.verification_target = '平均每天要铺多少米'
    analysis.discovery_flow = ['先求出总长度', '再根据新的完工天数计算', '最后得到每天要铺的米数']
    analysis.challenge_steps = ['先求总长度', '再除以目标天数', '得到每天的米数']
    analysis.interaction_flow = {
      trigger: '点击换算按钮',
      action: '保持总长度不变，调整天数后计算每天米数',
      feedback: ['显示总长度', '展示除法过程', '高亮最终答案'],
      reset: '重置后回到初始数据',
    }
    analysis.animation_flow = {
      type: '总量不变',
      description: `把总长度保持不变，再切换成 ${target || '目标'} 天完成`,
      visual_effect: ['总量高亮', '数值变化', '答案高亮'],
      duration: '0.8s',
    }
    analysis.knowledge = '工程问题'
    analysis.known_data = {
      per_day: perDay,
      original_days: originalDays,
      target_days: target,
      total_length: totalLength,
    }
    analysis.answer = { value: answerValue, unit: '米' }
    return analysis
  }

  analysis.known_conditions = [text].filter(Boolean)
  analysis.hidden_conditions = ['请继续补充题目条件']
  analysis.discovery_flow = ['先观察题目', '再找出关键条件', '最后完成推理']
  analysis.challenge_steps = ['理解题意', '整理条件', '得出答案']
  return analysis
}

function mockCoreDiscovery(prompt) {
  const text = String(prompt || '')
  const rules = [
    { keywords: ['工程', '铺设', '完工', '每天', '完成任务', '工作量', '效率'], value: '工作总量一定，效率和时间成反比' },
    { keywords: ['米', '厘米', '单位', '换算', '千米', '毫米', '分米'], value: '不同单位必须先统一' },
    { keywords: ['平均分', '平均分配', '每份', '平均分成', '分成若干份'], value: '总量平均分成若干份' },
    { keywords: ['移多补少', '平衡', '多出', '少了', '补齐'], value: '平均本质是平衡' },
    { keywords: ['相同部分', '去掉相同', '比较更容易', '消除相同'], value: '去掉相同部分后更容易比较' },
    { keywords: ['差额', '未重叠', '多几', '少几', '相差'], value: '差额来自未重叠部分' },
    { keywords: ['几个相同单位', '若干个相同单位', '一共几个', '整体'], value: '若干个相同单位组成整体' },
    { keywords: ['一一对应', '对应', '配对', '每个都对应'], value: '两组对象存在一一对应' },
    { keywords: ['时间', '过去', '经过', '后来', '现在', '将来'], value: '状态会随着时间变化' },
    { keywords: ['线段图', '长度关系', '画线段', '转化成长度'], value: '数量关系可以转化为长度关系' },
    { keywords: ['假设', '验证', '如果', '那么', '先设'], value: '先假设再验证' },
    { keywords: ['反推', '倒推', '从结果', '还原'], value: '从结果反推过程' },
    { keywords: ['规律', '生长', '变化', '后续', '递增'], value: '规律决定后续变化' },
    { keywords: ['点数', '段数', '线段', '连接'], value: '点数和段数存在固定关系' },
    { keywords: ['合起来', '总共', '一共', '各部分', '之和'], value: '整体等于各部分之和' },
  ]

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) return rule.value
  }

  const types = rules.map((rule) => rule.value)
  return types[Math.floor(Math.random() * types.length)]
}
