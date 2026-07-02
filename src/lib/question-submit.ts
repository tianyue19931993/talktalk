import { ensureValidSession } from './supabase-auth'
import type { JsonValue } from '../types/auth'

type ApiRecord = Record<string, unknown>

function isRecord(value: unknown): value is ApiRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export interface SubmitQuestionResult {
  success?: boolean
  error?: string
  notMath?: boolean
  quotaError?: string
  questionId?: string
  questionText?: string
  mathAnalysisJson?: JsonValue
  logicAnalysisJson?: JsonValue
  tutorAnalysisJson?: JsonValue
  componentAnalysisJson?: JsonValue
}

export async function submitQuestionForAnalysis(questionText: string): Promise<SubmitQuestionResult> {
  const session = await ensureValidSession()
  if (!session) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const res = await fetch('/api/user-questions/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ questionText }),
    })

    const text = await res.text()
    let data: unknown = {}
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: text }
      }
    }

    const payload = isRecord(data) ? data : {}

    if (!res.ok) {
      return {
        success: false,
        error: typeof payload.error === 'string' ? payload.error : `HTTP ${res.status}`,
        notMath: Boolean(payload.notMath),
        quotaError: typeof payload.quotaError === 'string' ? payload.quotaError : undefined,
      }
    }

    return payload as SubmitQuestionResult
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}
