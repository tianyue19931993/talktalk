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
    // 前端超时 60s
    const timeoutId = setTimeout(() => controller.abort(), 60000)

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

    // 先读文本，再尝试解析 JSON
    const text = await res.text()
    if (!text) {
      return { success: false, error: '服务器返回空响应，请稍后重试', questionId }
    }
    try {
      const data = JSON.parse(text)
      return data
    } catch {
      const preview = text.slice(0, 120)
      console.error('[generateDemo] 非 JSON 响应:', preview)
      return {
        success: false,
        error: '生成超时或服务器异常，题目已保存，请到「我的互动列表」中重新生成',
        timedOut: true,
        questionId,
      }
    }
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

/**
 * 轮询检测题目是否已生成（超时后的兜底机制）
 * 每 3s 查一次，最多查 30 次（90s）
 */
export async function pollQuestionDemos(
  questionId: string,
  onUpdate: (demos: any[]) => void,
  onDone: () => void,
  onTimeout: () => void
): Promise<void> {
  let attempts = 0
  const maxAttempts = 30

  const { getQuestionDemos } = await import('./user-questions')

  const poll = async () => {
    attempts++
    const demos = await getQuestionDemos(questionId)
    if (demos.length > 0) {
      onUpdate(demos)
      onDone()
      return
    }
    if (attempts >= maxAttempts) {
      onTimeout()
      return
    }
    setTimeout(poll, 3000)
  }

  poll()
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
