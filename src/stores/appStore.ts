import { useState, useMemo } from 'react'
import { Question, QuestionType, Tag, QuestionForm } from '../types'
import { getDb, safeQuery } from '../lib/supabase'

// ---------- in-memory cache ----------
let questions: Question[] = []
let types: QuestionType[] = []
let tags: Tag[] = []
let listeners: Array<() => void> = []
let loaded = false
let loading = false

export function subscribe(fn: () => void) {
  listeners.push(fn)
  return () => { listeners = listeners.filter((f) => f !== fn) }
}

function notify() { listeners.forEach((fn) => fn()) }

// ---------- data transformation ----------

function rowToQuestion(row: any): Question {
  return {
    id: row.id,
    title: row.title || '',
    subject: row.subject || '数学',
    grade: row.grade || '',
    typeId: row.type_id ? String(row.type_id) : '',
    typeName: '',
    tags: row.tags || [],
    question: row.question_text || '',
    content: { markdown: row.markdown || '' },
    images: row.images || [],
    htmlDemos: row.html_demos || [],
    status: row.status || 'draft',
    createdAt: row.created_at?.slice(0, 10) || '',
    updatedAt: row.updated_at?.slice(0, 10) || '',
  }
}

function questionToRow(q: Question) {
  return {
    id: q.id,
    title: q.title,
    subject: q.subject,
    grade: q.grade,
    type_id: q.typeId ? parseInt(q.typeId, 10) : null,
    tags: q.tags,
    question_text: q.question,
    markdown: q.content.markdown,
    images: q.images,
    html_demos: q.htmlDemos,
    status: q.status,
  }
}

function rowToType(row: any): QuestionType {
  return {
    id: String(row.id),
    name: row.name,
    icon: row.icon || '📝',
    description: row.description || '',
    createdAt: row.created_at?.slice(0, 10) || '',
    updatedAt: row.updated_at?.slice(0, 10) || '',
  }
}

function rowToTag(row: any): Tag {
  return {
    id: String(row.id),
    name: row.name,
    count: 0,
    createdAt: row.created_at?.slice(0, 10) || '',
  }
}

function resolveTypeNames() {
  const typeMap = Object.fromEntries(types.map((t) => [t.id, t.name]))
  questions.forEach((q) => { q.typeName = typeMap[q.typeId] || '' })
}

function computeTagCounts() {
  const counts: Record<string, number> = {}
  questions.forEach((q) => { q.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1 }) })
  tags.forEach((t) => { t.count = counts[t.name] || 0 })
}

function syncToLocal() {
  try {
    localStorage.setItem('talktalk_questions', JSON.stringify(questions))
    localStorage.setItem('talktalk_types', JSON.stringify(types))
    localStorage.setItem('talktalk_tags', JSON.stringify(tags))
  } catch {}
}

// ---------- load from Supabase with timeout ----------
async function ensureLoaded() {
  if (loaded || loading) return
  loading = true

  try {
    const db = getDb()
    if (!db) throw new Error('Supabase not configured')

    const [qr, tyr, tar] = await Promise.all([
      safeQuery((d) => d.from('questions').select('*').order('created_at', { ascending: false })),
      safeQuery((d) => d.from('question_types').select('*').order('created_at')),
      safeQuery((d) => d.from('tags').select('*').order('created_at')),
    ])

    if (qr.error) throw qr.error
    if (tyr.error) throw tyr.error
    if (tar.error) throw tar.error

    questions = (qr.data || []).map(rowToQuestion)
    types = (tyr.data || []).map(rowToType)
    tags = (tar.data || []).map(rowToTag)
    resolveTypeNames()
    computeTagCounts()
    syncToLocal()
  } catch (e: any) {
    console.warn('Supabase unavailable, using cached data:', e?.message || e)
    try {
      const rawQ = localStorage.getItem('talktalk_questions')
      const rawT = localStorage.getItem('talktalk_types')
      const rawTa = localStorage.getItem('talktalk_tags')
      if (rawQ) questions = JSON.parse(rawQ)
      if (rawT) types = JSON.parse(rawT)
      if (rawTa) tags = JSON.parse(rawTa)
      resolveTypeNames()
      computeTagCounts()
    } catch {}
  }

  loaded = true
  loading = false
  notify()
}

ensureLoaded()

// ---------- sync accessors ----------
export function getQuestions(): Question[] { return questions }
export function getTypes(): QuestionType[] { return types }
export function getTags(): Tag[] { return tags }

// ---------- helpers ----------
function db() {
  const d = getDb()
  if (!d) throw new Error('Supabase not configured')
  return d
}

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
  computeTagCounts()
  syncToLocal()
  notify()
  try {
    db().from('questions').insert(questionToRow(q))
      .then(({ error }) => { if (error) console.warn('addQuestion error:', error) })
  } catch {}
  return q
}

export function updateQuestion(id: string, data: QuestionForm) {
  const index = questions.findIndex((q) => q.id === id)
  if (index === -1) return
  const t = types.find((t) => t.id === data.typeId)
  questions[index] = { ...questions[index], ...data, typeName: t?.name || '', updatedAt: new Date().toISOString().slice(0, 10) }
  computeTagCounts()
  syncToLocal()
  notify()
  try {
    db().from('questions').update(questionToRow(questions[index])).eq('id', id)
      .then(({ error }) => { if (error) console.warn('updateQuestion error:', error) })
  } catch {}
}

export function deleteQuestion(id: string) {
  questions = questions.filter((q) => q.id !== id)
  computeTagCounts()
  syncToLocal()
  notify()
  try {
    db().from('questions').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('deleteQuestion error:', error) })
  } catch {}
}

export async function addType(data: { name: string; description?: string; icon?: string }): Promise<QuestionType> {
  const { data: inserted, error } = await safeQuery((d) =>
    d.from('question_types').insert({
      name: data.name, icon: data.icon || '📝', description: data.description || '',
    }).select().single()
  )
  if (error || !inserted) throw error || new Error('insert returned no data')

  const t = rowToType(inserted)
  types = [...types, t]
  syncToLocal()
  notify()
  return t
}

export async function updateType(id: string, data: { name?: string; description?: string }) {
  const index = types.findIndex((t) => t.id === id)
  if (index === -1) return
  const patch: any = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.description !== undefined) patch.description = data.description

  types[index] = { ...types[index], ...patch, updatedAt: new Date().toISOString().slice(0, 10) }
  resolveTypeNames()
  syncToLocal()
  notify()

  try {
    const numId = parseInt(id, 10)
    db().from('question_types').update(patch).eq('id', numId)
      .then(({ error }) => { if (error) console.warn('updateType error:', error) })
  } catch {}
}

export async function deleteType(id: string) {
  types = types.filter((t) => t.id !== id)
  questions = questions.map((q) => q.typeId === id ? { ...q, typeId: '', typeName: '' } : q)
  syncToLocal()
  notify()

  try {
    const numId = parseInt(id, 10)
    db().from('question_types').delete().eq('id', numId)
      .then(({ error }) => { if (error) console.warn('deleteType error:', error) })
  } catch {}
}

export async function addTag(name: string): Promise<Tag> {
  const { data: inserted, error } = await safeQuery((d) =>
    d.from('tags').insert({ name }).select().single()
  )
  if (error || !inserted) throw error || new Error('insert returned no data')

  const t = rowToTag(inserted)
  tags = [...tags, t]
  syncToLocal()
  notify()
  return t
}

export async function updateTag(id: string, name: string) {
  const index = tags.findIndex((t) => t.id === id)
  if (index === -1) return

  tags[index] = { ...tags[index], name }
  syncToLocal()
  notify()

  try {
    const numId = parseInt(id, 10)
    db().from('tags').update({ name }).eq('id', numId)
      .then(({ error }) => { if (error) console.warn('updateTag error:', error) })
  } catch {}
}

export async function deleteTag(id: string) {
  tags = tags.filter((t) => t.id !== id)
  syncToLocal()
  notify()

  try {
    const numId = parseInt(id, 10)
    db().from('tags').delete().eq('id', numId)
      .then(({ error }) => { if (error) console.warn('deleteTag error:', error) })
  } catch {}
}

// ---------- React hook ----------
export function useStore() {
  const [, setTick] = useState(0)
  useMemo(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    if (!loaded) ensureLoaded().then(() => setTick((t) => t + 1))
    return unsub
  }, [])
  return { questions, types, tags }
}
