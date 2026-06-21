import { useState, useEffect } from 'react'
import { Question, QuestionType, Tag, QuestionForm } from '../types'
import { query, insert, update as supdate, remove, isConfigured } from '../lib/supabase'

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
    htmlDemos: row.html_demos || [],
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
    html_demos: q.htmlDemos, status: q.status,
  }
}

function rowToType(row: any): QuestionType {
  return {
    id: String(row.id), name: row.name,
    coreDiscovery: row.core_discovery || '',
    analysisPrompt: row.analysis_prompt || '',
    htmlPrompt: row.html_prompt || '',
    discoveryFlow: row.discovery_flow || '',
    interactionFlow: row.interaction_flow || '',
    animationFlow: row.animation_flow || '',
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

// ---------- sync from Supabase ----------

if (isConfigured()) {
  syncFromSupabase()
}

export async function syncFromSupabase(): Promise<void> {
  try {
    const [qr, tyr, tar] = await Promise.all([
      query<any[]>('questions', { order: 'created_at', ascending: false }),
      query<any[]>('question_types', { order: 'created_at' }),
      query<any[]>('tags', { order: 'created_at' }),
    ])

    if (qr.error) console.warn('Supabase sync warning (questions):', qr.error)
    if (tyr.error) console.warn('Supabase sync warning (types):', tyr.error)
    if (tar.error) console.warn('Supabase sync warning (tags):', tar.error)

    questions = (qr.data || []).map(rowToQuestion)
    types = (tyr.data || []).map(rowToType)
    tags = (tar.data || []).map(rowToTag)
    resolveTypeNames()
    computeTagCounts()
    notify()
  } catch (e) {
    console.error('Supabase sync error:', e)
  }
}

/** 手动刷新数据（供外部使用，如登录后/操作后刷新） */
export function refreshStore() {
  syncFromSupabase()
}

// ---------- sync accessors ----------
export function getQuestions(): Question[] { return questions }
export function getTypes(): QuestionType[] { return types }
export function getTags(): Tag[] { return tags }

// ---------- mutations ----------

export function addQuestion(data: QuestionForm): Question {
  const id = 'lesson-' + crypto.randomUUID().slice(0, 8)
  const now = new Date().toISOString().slice(0, 10)
  const t = types.find((t) => t.id === data.typeId)
  const q: Question = {
    id, title: data.title, subject: data.subject, grade: data.grade,
    typeId: data.typeId, typeName: t?.name || '',
    tags: data.tags, question: data.question,
    content: { markdown: data.markdown },
    htmlDemos: data.htmlDemos, status: data.status,
    createdAt: now, updatedAt: now,
  }
  questions = [q, ...questions]
  computeTagCounts(); notify()
  insert('questions', questionToRow(q)).then(() => syncFromSupabase()).catch((e) => {
    console.error('addQuestion Supabase insert failed:', e)
    // revert optimistic update
    questions = questions.filter((x) => x.id !== id)
    computeTagCounts(); notify()
  })
  return q
}

export function updateQuestion(id: string, data: QuestionForm) {
  const i = questions.findIndex((q) => q.id === id)
  if (i === -1) return
  const t = types.find((t) => t.id === data.typeId)
  questions[i] = { ...questions[i], ...data, typeName: t?.name || '', updatedAt: new Date().toISOString().slice(0, 10) }
  computeTagCounts(); notify()
  supdate('questions', 'id', id, questionToRow(questions[i])).catch((e) => {
    console.error('updateQuestion failed:', e)
    refreshStore()
  })
}

export function deleteQuestion(id: string) {
  const deleted = questions.find((q) => q.id === id)
  questions = questions.filter((q) => q.id !== id)
  computeTagCounts(); notify()
  remove('questions', 'id', id).catch((e) => {
    console.error('deleteQuestion failed:', e)
    if (deleted) { questions = [...questions, deleted]; computeTagCounts(); notify() }
  })
}

export async function addType(data: { name: string; coreDiscovery?: string; analysisPrompt?: string; htmlPrompt?: string; discoveryFlow?: string; interactionFlow?: string; animationFlow?: string }): Promise<QuestionType> {
  const r = await insert<any[]>('question_types', {
    name: data.name,
    core_discovery: data.coreDiscovery || '',
    analysis_prompt: data.analysisPrompt || '',
    html_prompt: data.htmlPrompt || '',
    discovery_flow: data.discoveryFlow || '',
    interaction_flow: data.interactionFlow || '',
    animation_flow: data.animationFlow || '',
  })
  if (r.error || !r.data) throw r.error || new Error('insert failed')
  const t = rowToType(r.data[0]); types = [...types, t]; notify()
  return t
}

export async function updateType(id: string, data: { name?: string; coreDiscovery?: string; analysisPrompt?: string; htmlPrompt?: string; discoveryFlow?: string; interactionFlow?: string; animationFlow?: string }) {
  const i = types.findIndex((t) => t.id === id); if (i === -1) return
  const p: Record<string, string> = {};
  if (data.name !== undefined) p.name = data.name
  if (data.coreDiscovery !== undefined) p.core_discovery = data.coreDiscovery
  if (data.analysisPrompt !== undefined) p.analysis_prompt = data.analysisPrompt
  if (data.htmlPrompt !== undefined) p.html_prompt = data.htmlPrompt
  if (data.discoveryFlow !== undefined) p.discovery_flow = data.discoveryFlow
  if (data.interactionFlow !== undefined) p.interaction_flow = data.interactionFlow
  if (data.animationFlow !== undefined) p.animation_flow = data.animationFlow
  types[i] = { ...types[i], ...p, updatedAt: new Date().toISOString().slice(0, 10) }
  resolveTypeNames(); notify()
  supdate('question_types', 'id', parseInt(id, 10), p).catch((e) => {
    console.error('updateType failed:', e)
    refreshStore()
  })
}

export async function deleteType(id: string) {
  types = types.filter((t) => t.id !== id)
  questions = questions.map((q) => q.typeId === id ? { ...q, typeId: '', typeName: '' } : q)
  notify()
  remove('question_types', 'id', parseInt(id, 10)).catch((e) => {
    console.error('deleteType failed:', e)
    refreshStore()
  })
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
  supdate('tags', 'id', parseInt(id, 10), { name }).catch((e) => {
    console.error('updateTag failed:', e)
    refreshStore()
  })
}

export async function deleteTag(id: string) {
  tags = tags.filter((t) => t.id !== id); notify()
  remove('tags', 'id', parseInt(id, 10)).catch((e) => {
    console.error('deleteTag failed:', e)
    refreshStore()
  })
}

// ---------- React hook ----------
export function useStore() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])

  return { questions, types, tags }
}
