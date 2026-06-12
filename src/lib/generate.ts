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
}

/** 触发生成（首次或重新生成） */
export async function generateDemo(
  questionId: string,
  options?: { regenerate?: boolean }
): Promise<GenerateResult> {
  try {
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
    })

    const data = await res.json()
    return data
  } catch (e: any) {
    return { success: false, error: e.message || '网络错误' }
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
