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
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

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

  // Vercel Hobby 计划函数最大 10s，每个 AI 调用单独设超时
  const timeoutMs = (options.timeoutSeconds || 7) * 1000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
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

// ─── Mock 模式（无 API Key 时使用） ───────────────────────

function mockAI(options) {
  const promptText = String(options.prompt || '')
  const coreDiscovery = mockCoreDiscovery(promptText)

  // 如果 prompt 包含 analysis_prompt 字样，返回分析 JSON
  if (options.responseFormat === 'json_object' || promptText.includes('严格按照以下 JSON')) {
    return {
      success: true,
      content: JSON.stringify({
        question_type: coreDiscovery,
        knowledge: '长度单位换算',
        known_data: { value: 3, from_unit: '米', to_unit: '厘米' },
        steps: ['确定单位关系：1米 = 100厘米', '进行换算：3 × 100 = 300', '得到结果：3米 = 300厘米'],
        answer: { value: 300, unit: '厘米' },
      }),
    }
  }

  // HTML 生成 prompt → 返回一个简单的演示 HTML
  if (promptText.includes('html_prompt') || promptText.includes('生成互动HTML')) {
    const color = ['#7928ca', '#0070f3', '#ff0080'][Math.floor(Math.random() * 3)]
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
  <div class="display">3 m = 300 cm</div>
  <div class="step">📌 单位关系：1米 = 100厘米</div>
  <div class="step">✏️ 计算：3 × 100 = 300</div>
  <div class="step">✅ 答案：3米 = 300厘米</div>
  <div class="footer">TalkTalk · AI 生成</div>
</div>
</html>`,
    }
  }

  // 题型识别 → 返回一个 core_discovery
  return {
    success: true,
    content: coreDiscovery,
  }
}

function mockCoreDiscovery(prompt) {
  const text = String(prompt || '')
  const rules = [
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
