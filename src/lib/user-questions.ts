// 用户个人题目 API（区别于管理员维护的题库）
import { authedRequest, loadSession } from './supabase-auth'
import type { UserQuestion, UserHtmlDemo } from '../types/auth'

const TABLE = 'user_questions'

function rowToUserQuestion(row: any): UserQuestion {
  return {
    id: row.id,
    userId: row.user_id,
    questionText: row.question_text,
    htmlDemos: (row.html_demos || []) as UserHtmlDemo[],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** 获取当前用户的题目列表 */
export async function getMyQuestions(): Promise<UserQuestion[]> {
  const session = loadSession()
  if (!session) return []

  const { data } = await authedRequest<any[]>(
    `/${TABLE}?user_id=eq.${session.user.id}&order=created_at.desc`
  )
  return (data || []).map(rowToUserQuestion)
}

/** 新增用户题目 */
export async function createUserQuestion(questionText: string): Promise<UserQuestion | null> {
  const session = loadSession()
  if (!session) return null

  const { data } = await authedRequest<any[]>(`/${TABLE}`, {
    method: 'POST',
    body: { question_text: questionText, user_id: session.user.id },
  })
  return data?.[0] ? rowToUserQuestion(data[0]) : null
}

/** 获取单条用户题目详情 */
export async function getUserQuestion(id: string): Promise<UserQuestion | null> {
  const { data } = await authedRequest<any[]>(`/${TABLE}?id=eq.${id}`)
  return data?.[0] ? rowToUserQuestion(data[0]) : null
}

/** 获取所有用户题目（admin） */
export async function getAllUserQuestions(): Promise<UserQuestion[]> {
  const { data } = await authedRequest<any[]>(`/${TABLE}?order=created_at.desc`)
  return (data || []).map(rowToUserQuestion)
}

/** Admin 更新用户题目的 htmlDemos */
export async function updateUserQuestionDemos(id: string, htmlDemos: UserHtmlDemo[]): Promise<void> {
  const status = htmlDemos.length > 0 ? 'uploaded' : 'pending'
  await authedRequest(`/${TABLE}?id=eq.${id}`, {
    method: 'PATCH',
    body: { html_demos: htmlDemos, status },
  })
}

/** Admin 上传一个 HTML 文件追加到用户题目 */
export async function adminUploadUserQuestionHtml(id: string, file: File): Promise<void> {
  // 先拿到已有 demos
  const existing = await getUserQuestion(id)
  const demos = [...(existing?.htmlDemos || [])]
  const index = demos.length + 1

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(reader.result as string)
      demos.push({ title: `演示 ${index}`, url: dataUrl })
      try {
        await updateUserQuestionDemos(id, demos)
        resolve()
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
