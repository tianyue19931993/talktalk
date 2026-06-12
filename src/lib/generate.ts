/**
 * 前端生成 API 调用工具
 * 
 * 调用 POST /api/generate/demo 触发完整 AI 生成链路。
 */

interface GenerateResult {
  success: boolean
  demoId?: string
  htmlUrl?: string
  error?: string
  timedOut?: boolean
  questionId?: string
}

/** 触发生成（首次或重新生成） */
export async function generateDemo(
  questionId: string,
  options?: { regenerate?: boolean }
): Promise<GenerateResult> {
  try {
    const controller = new AbortController()
    // 55 秒超时（Vercel Serverless 免费套餐最大 60s）
    const timeoutId = setTimeout(() => controller.abort(), 55000)

    const token = getAccessToken()
    const res = await fetch('/api/generate/demo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        questionId,
        regenerate: options?.regenerate ?? false,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const data = await res.json()
    return data
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return {
        success: false,
        error: 'timeout',
        timedOut: true,
        questionId,
      }
    }
    return { success: false, error: e.message || '网络错误', questionId }
  }
}

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('talktalk_auth')
    if (!raw) return null
    const session = JSON.parse(raw)
    if (session.expiresAt && Date.now() > session.expiresAt * 1000) return null
    return session.accessToken || null
  } catch {
    return null
  }
}
