import { useState, useMemo } from 'react'
import { Question, QuestionType, Tag, QuestionForm } from '../types'
import { query, insert, update as supdate, remove, isConfigured } from '../lib/supabase'

// eslint-disable-next-line
const DBG = (msg: string) => console.log('[talktalk]', msg, new Date().toISOString().slice(11, 19))

// ---------- in-memory cache ----------
let questions: Question[] = []
let types: QuestionType[] = []
let tags: Tag[] = []
let listeners: Array<() => void> = []

export function subscribe(fn: () => void) {
  listeners.push(fn)
  return () => { listeners = listeners.filter((f) => f !== fn) }
}

function notify() { listeners.forEach((fn) => fn()) }

// ---------- data transformation ----------

function rowToQuestion(row: any): Question {
  return {
    id: row.id, title: row.title || '', subject: row.subject || '数学',
    grade: row.grade || '', typeId: row.type_id ? String(row.type_id) : '',
    typeName: '', tags: row.tags || [], question: row.question_text || '',
    content: { markdown: row.markdown || '' },
    images: row.images || [], htmlDemos: row.html_demos || [],
    status: row.status || 'draft',
    createdAt: row.created_at?.slice(0, 10) || '',
    updatedAt: row.updated_at?.slice(0, 10) || '',
  }
}

function questionToRow(q: Question) {
  return {
    id: q.id, title: q.title, subject: q.subject, grade: q.grade,
    type_id: q.typeId ? parseInt(q.typeId, 10) : null,
    tags: q.tags, question_text: q.question, markdown: q.content.markdown,
    images: q.images, html_demos: q.htmlDemos, status: q.status,
  }
}

function rowToType(row: any): QuestionType {
  return {
    id: String(row.id), name: row.name, icon: row.icon || '📝',
    description: row.description || '',
    createdAt: row.created_at?.slice(0, 10) || '',
    updatedAt: row.updated_at?.slice(0, 10) || '',
  }
}

function rowToTag(row: any): Tag {
  return {
    id: String(row.id), name: row.name, count: 0,
    createdAt: row.created_at?.slice(0, 10) || '',
  }
}

function resolveTypeNames() {
  const m = Object.fromEntries(types.map((t) => [t.id, t.name]))
  questions.forEach((q) => { q.typeName = m[q.typeId] || '' })
}

function computeTagCounts() {
  const c: Record<string, number> = {}
  questions.forEach((q) => { q.tags.forEach((t) => { c[t] = (c[t] || 0) + 1 }) })
  tags.forEach((t) => { t.count = c[t.name] || 0 })
}

// ---------- 完全清空 localStorage，不再读取 ----------
DBG('clearing localStorage')
try {
  localStorage.removeItem('talktalk_questions')
  localStorage.removeItem('talktalk_types')
  localStorage.removeItem('talktalk_tags')
} catch {}

// ---------- sync from Supabase ----------
DBG('app store ready')

if (isConfigured()) {
  syncFromSupabase()
}

async function syncFromSupabase() {
  DBG('starting Supabase sync...')
  try {
    const [qr, tyr, tar] = await Promise.all([
      query<any[]>('questions', { order: 'created_at', ascending: false }),
      query<any[]>('question_types', { order: 'created_at' }),
      query<any[]>('tags', { order: 'created_at' }),
    ])

    DBG('Supabase sync complete')

    if (qr.error || tyr.error || tar.error) {
      console.warn('Supabase sync failed:', qr.error, tyr.error, tar.error)
      return
    }

    questions = (qr.data || []).map(rowToQuestion)
    types = (tyr.data || []).map(rowToType)
    tags = (tar.data || []).map(rowToTag)
    resolveTypeNames()
    computeTagCounts()
    notify()
    DBG('data loaded, rendered')
  } catch (e) {
    console.warn('Supabase sync error:', e)
  }
}

// ---------- sync accessors ----------
export function getQuestions(): Question[] { DBG('getQuestions called, count=' + questions.length); return questions }
export function getTypes(): QuestionType[] { return types }
export function getTags(): Tag[] { return tags }

// ---------- mutations ----------

export function addQuestion(data: QuestionForm): Question {
  const id = `lesson-${String(Date.now()).slice(-6)}`
  const now = new Date().toISOString().slice(0, 10)
  const t = types.find((t) => t.id === data.typeId)
  const q: Question = {
    id, title: data.title, subject: data.subject, grade: data.grade,
    typeId: data.typeId, typeName: t?.name || '',
    tags: data.tags, question: data.question,
    content: { markdown: data.markdown }, images: data.images,
    htmlDemos: data.htmlDemos, status: data.status,
    createdAt: now, updatedAt: now,
  }
  questions = [q, ...questions]
  computeTagCounts(); notify()
  insert('questions', questionToRow(q)).catch(() => {})
  return q
}

export function updateQuestion(id: string, data: QuestionForm) {
  const i = questions.findIndex((q) => q.id === id)
  if (i === -1) return
  const t = types.find((t) => t.id === data.typeId)
  questions[i] = { ...questions[i], ...data, typeName: t?.name || '', updatedAt: new Date().toISOString().slice(0, 10) }
  computeTagCounts(); notify()
  supdate('questions', 'id', id, questionToRow(questions[i])).catch(() => {})
}

export function deleteQuestion(id: string) {
  questions = questions.filter((q) => q.id !== id)
  computeTagCounts(); notify()
  remove('questions', 'id', id).catch(() => {})
}

export async function addType(data: { name: string; description?: string; icon?: string }): Promise<QuestionType> {
  const r = await insert<any[]>('question_types', { name: data.name, icon: data.icon || '📝', description: data.description || '' })
  if (r.error || !r.data) throw r.error || new Error('insert failed')
  const t = rowToType(r.data[0]); types = [...types, t]; notify()
  return t
}

export async function updateType(id: string, data: { name?: string; description?: string }) {
  const i = types.findIndex((t) => t.id === id); if (i === -1) return
  const p: any = {}; if (data.name !== undefined) p.name = data.name; if (data.description !== undefined) p.description = data.description
  types[i] = { ...types[i], ...p, updatedAt: new Date().toISOString().slice(0, 10) }
  resolveTypeNames(); notify()
  supdate('question_types', 'id', parseInt(id, 10), p).catch(() => {})
}

export async function deleteType(id: string) {
  types = types.filter((t) => t.id !== id)
  questions = questions.map((q) => q.typeId === id ? { ...q, typeId: '', typeName: '' } : q)
  notify()
  remove('question_types', 'id', parseInt(id, 10)).catch(() => {})
}

export async function addTag(name: string): Promise<Tag> {
  const r = await insert<any[]>('tags', { name })
  if (r.error || !r.data) throw r.error || new Error('insert failed')
  const t = rowToTag(r.data[0]); tags = [...tags, t]; notify()
  return t
}

export async function updateTag(id: string, name: string) {
  const i = tags.findIndex((t) => t.id === id); if (i === -1) return
  tags[i] = { ...tags[i], name }; notify()
  supdate('tags', 'id', parseInt(id, 10), { name }).catch(() => {})
}

export async function deleteTag(id: string) {
  tags = tags.filter((t) => t.id !== id); notify()
  remove('tags', 'id', parseInt(id, 10)).catch(() => {})
}

// ---------- React hook ----------
export function useStore() {
  const [, setTick] = useState(0)
  useMemo(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])
  return { questions, types, tags }
}
