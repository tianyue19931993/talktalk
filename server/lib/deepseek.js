const BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')
const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro'

function stripCodeFences(text) {
  const trimmed = text.trim()
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim()
  }
  return trimmed
}

function parseJsonContent(content) {
  const cleaned = stripCodeFences(content)
  try {
    return JSON.parse(cleaned)
  } catch {
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
    }
    throw new Error('DeepSeek 返回的内容不是有效 JSON')
  }
}

export function isDeepSeekConfigured() {
  return !!API_KEY
}

export async function deepseekJson({
  systemPrompt,
  userPrompt,
  model = MODEL,
  temperature = 0.2,
  timeoutMs = 120000,
}) {
  if (!API_KEY) {
    throw new Error('DeepSeek 未配置')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: userPrompt },
        ],
        temperature,
      }),
      signal: controller.signal,
    })

    const text = await res.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }

    if (!res.ok) {
      throw new Error(`DeepSeek 调用失败 (${res.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`)
    }

    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('DeepSeek 没有返回有效内容')
    }

    return parseJsonContent(content)
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('DeepSeek 调用超时')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
