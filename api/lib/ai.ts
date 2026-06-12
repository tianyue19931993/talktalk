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

interface AICallOptions {
  /** 用户消息（主要输入） */
  prompt: string
  /** 系统消息（角色设定 / prompt 模板） */
  systemPrompt?: string
  /** 温度，默认 0.7 */
  temperature?: number
  /** 最大输出 token，默认 4096 */
  maxTokens?: number
  /** 输出格式：text 或 json_object */
  responseFormat?: 'text' | 'json_object'
}

interface AICallResult {
  success: boolean
  content: string
  error?: string
}

/**
 * 调用 AI（当前为 DeepSeek Chat）
 * 
 * 未配置 API Key 时返回 mock 数据，方便前端调试。
 * 配置 DEEPSEEK_API_KEY 后自动切换为真实调用。
 */
export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    console.warn('[AI] DEEPSEEK_API_KEY 未配置，使用 mock 模式')
    return mockAI(options)
  }

  const messages: any[] = []
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt })
  }
  messages.push({ role: 'user', content: options.prompt })

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
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, content: '', error: `AI API ${res.status}: ${err}` }
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    return { success: true, content }
  } catch (e: any) {
    return { success: false, content: '', error: e.message || 'AI call failed' }
  }
}

// ─── Mock 模式（无 API Key 时使用） ───────────────────────

function mockAI(options: AICallOptions): AICallResult {
  // 如果 prompt 包含 analysis_prompt 字样，返回分析 JSON
  if (options.responseFormat === 'json_object' || options.prompt.includes('严格按照以下 JSON')) {
    return {
      success: true,
      content: JSON.stringify({
        question_type: mockQuestionType(options.prompt),
        knowledge: '长度单位换算',
        known_data: { value: 3, from_unit: '米', to_unit: '厘米' },
        steps: ['确定单位关系：1米 = 100厘米', '进行换算：3 × 100 = 300', '得到结果：3米 = 300厘米'],
        answer: { value: 300, unit: '厘米' },
      }),
    }
  }

  // HTML 生成 prompt → 返回一个简单的演示 HTML
  if (options.prompt.includes('html_prompt') || options.prompt.includes('生成互动HTML')) {
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
</body>
</html>`,
    }
  }

  // 题型识别 → 返回一个默认题型
  return {
    success: true,
    content: '植树问题',
  }
}

function mockQuestionType(prompt: string): string {
  const types = ['植树问题', '鸡兔同笼', '和差问题', '相遇问题', '归一问题', '工程问题']
  return types[Math.floor(Math.random() * types.length)]
}
