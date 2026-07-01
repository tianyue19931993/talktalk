// 用户个人题目 API（区别于管理员维护的题库）
import { authedRequest, loadSession } from './supabase-auth'
import type { JsonValue, UserQuestion, QuestionDemo } from '../types/auth'

type DbRow = Record<string, unknown>

function getString(row: DbRow, key: string, fallback = ''): string {
  const value = row[key]
  return typeof value === 'string' ? value : fallback
}

function getJson(row: DbRow, key: string, fallback: JsonValue = {}): JsonValue {
  const value = row[key]
  return value === undefined || value === null ? fallback : (value as JsonValue)
}

// ============================================================
// user_questions
// ============================================================

function rowToUserQuestion(row: DbRow): UserQuestion {
  return {
    id: getString(row, 'id'),
    userId: getString(row, 'user_id'),
    questionText: getString(row, 'question_text'),
    questionType: getString(row, 'question_type'),
    questionTypeId: typeof row.question_type_id === 'number' ? row.question_type_id : null,
    coreDiscovery: getString(row, 'core_discovery'),
    analysisJson: getJson(row, 'analysis_json', {}),
    mathAnalysisJson: getJson(row, 'math_analysis_json', {}),
    logicAnalysisJson: getJson(row, 'logic_analysis_json', {}),
    tutorAnalysisJson: getJson(row, 'tutor_analysis_json', {}),
    componentAnalysisJson: getJson(row, 'component_analysis_json', {}),
    status: (getString(row, 'status') as UserQuestion['status']) || 'pending',
    createdAt: getString(row, 'created_at'),
    updatedAt: getString(row, 'updated_at'),
  }
}

/** 获取当前用户的题目列表 */
export async function getMyQuestions(): Promise<UserQuestion[]> {
  const session = loadSession()
  if (!session) return []

  const { data } = await authedRequest<DbRow[]>(
    `/user_questions?user_id=eq.${session.user.id}&order=created_at.desc`
  )
  return (data || []).map(rowToUserQuestion)
}

/** 新增用户题目 */
export async function createUserQuestion(questionText: string): Promise<UserQuestion | null> {
  const session = loadSession()
  if (!session) return null

  const body: DbRow = { question_text: questionText, user_id: session.user.id }

  const { data } = await authedRequest<DbRow[]>('/user_questions', {
    method: 'POST',
    body,
  })
  return data?.[0] ? rowToUserQuestion(data[0]) : null
}

/** 获取单条用户题目详情 */
export async function getUserQuestion(id: string): Promise<UserQuestion | null> {
  const { data } = await authedRequest<DbRow[]>(`/user_questions?id=eq.${id}`)
  return data?.[0] ? rowToUserQuestion(data[0]) : null
}

/** 获取所有用户题目（admin） */
export async function getAllUserQuestions(): Promise<UserQuestion[]> {
  const { data } = await authedRequest<DbRow[]>(`/user_questions?order=created_at.desc`)
  return (data || []).map(rowToUserQuestion)
}

// ============================================================
// question_demos（每个题目的多个生成记录）
// ============================================================

function rowToDemo(row: DbRow): QuestionDemo {
  return {
    id: getString(row, 'id'),
    questionId: getString(row, 'question_id'),
    htmlUrl: getString(row, 'html_url'),
    title: getString(row, 'title'),
    createdAt: getString(row, 'created_at'),
  }
}

export interface GenerateQuestionDemoResult {
  success?: boolean
  error?: string
  demo?: QuestionDemo | null
  htmlUrl?: string
}

/** 获取某个题目的所有演示记录 */
export async function getQuestionDemos(questionId: string): Promise<QuestionDemo[]> {
  const { data } = await authedRequest<DbRow[]>(
    `/question_demos?question_id=eq.${questionId}&order=created_at.desc`
  )
  return (data || []).map(rowToDemo)
}

/** 批量获取多个题目的演示记录（keyed by question_id） */
export async function getQuestionDemosBatch(questionIds: string[]): Promise<Record<string, QuestionDemo[]>> {
  if (questionIds.length === 0) return {}
  // Supabase REST: in 查询
  const ids = questionIds.map(id => id).join(',')
  const { data } = await authedRequest<DbRow[]>(
    `/question_demos?question_id=in.(${ids})&order=created_at.desc`
  )
  const map: Record<string, QuestionDemo[]> = {}
  for (const id of questionIds) map[id] = []
  for (const row of (data || [])) {
    const qid = getString(row, 'question_id')
    if (map[qid]) map[qid].push(rowToDemo(row))
  }
  return map
}

/** 为题目创建一条新的演示记录 */
export async function createQuestionDemo(questionId: string, htmlUrl: string, title?: string): Promise<QuestionDemo | null> {
  const { data } = await authedRequest<DbRow[]>('/question_demos', {
    method: 'POST',
    body: { question_id: questionId, html_url: htmlUrl, title: title || '' },
  })
  return data?.[0] ? rowToDemo(data[0]) : null
}

/** 删除一条演示记录 */
export async function deleteQuestionDemo(id: string): Promise<void> {
  await authedRequest(`/question_demos?id=eq.${id}`, { method: 'DELETE' })
}

/** 为题目生成一条新的互动演示记录 */
export async function generateQuestionDemo(questionId: string): Promise<GenerateQuestionDemoResult> {
  const session = loadSession()
  if (!session) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const res = await fetch('/api/user-questions/generate-interaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ questionId }),
    })

    const text = await res.text()
    let data: GenerateQuestionDemoResult = {}
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { success: false, error: text }
      }
    }

    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}`,
      }
    }

    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/** 下载题目的某条演示 HTML */
export async function downloadQuestionDemo(demoId: string, filename = '演示.html'): Promise<void> {
  const session = loadSession()
  if (!session) {
    throw new Error('Not authenticated')
  }

  const res = await fetch(`/api/user-questions/download-demo?demoId=${encodeURIComponent(demoId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    let error = `HTTP ${res.status}`
    if (text) {
      try {
        const parsed = JSON.parse(text)
        error = parsed.error || error
      } catch {
        error = text
      }
    }
    throw new Error(error)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Admin：上传 HTML 文件到题目的演示列表（优先 Kodo，降级 data:URL） */
export async function adminUploadUserQuestionHtml(questionId: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const content = reader.result as string
      try {
        // 尝试上传到 Kodo
        let htmlUrl = ''
        try {
          const res = await fetch('/api/upload-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content,
              type: 'user',
              refId: questionId,
            }),
          })
          const data = await res.json()
          if (data.success && data.url) {
            htmlUrl = data.url
          }
        } catch {
          // Kodo 上传失败，静默降级
        }
        if (!htmlUrl) {
          htmlUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(content)
        }

        const existing = await getQuestionDemos(questionId)
        await createQuestionDemo(questionId, htmlUrl, `演示 ${existing.length + 1}`)
        resolve()
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

// ============================================================
// user_generations（AI 生成统计，预留）
// ============================================================

/** 获取当前用户的生成统计 */
export async function getUserGeneration(): Promise<{ totalCount: number; usedCount: number } | null> {
  const session = loadSession()
  if (!session) return null

  const { data } = await authedRequest<DbRow[]>(
    `/user_generations?user_id=eq.${session.user.id}`
  )

  if (!data || data.length === 0) return { totalCount: 0, usedCount: 0 }
  return {
    totalCount: typeof data[0].total_count === 'number' ? data[0].total_count : 0,
    usedCount: typeof data[0].used_count === 'number' ? data[0].used_count : 0,
  }
}
