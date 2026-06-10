import { useState, useMemo } from 'react'
import { Question, QuestionType, Tag, QuestionForm } from '../types'
import { supabase } from '../lib/supabase'
import initialQuestions from '../data/sampleQuestions'
import initialTypes from '../data/sampleTypes'
import initialTags from '../data/sampleTags'

// ---------- in-memory cache ----------
let questions: Question[] = []
let types: QuestionType[] = []
let tags: Tag[] = []
let listeners: Array<() => void> = []
let loaded = false
let loading = false

export function subscribe(fn: () => void) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((f) => f !== fn)
  }
}

function notify() {
  listeners.forEach((fn) => fn())
}

// ---------- data transformation ----------

function rowToQuestion(row: any): Question {
  return {
    id: row.id,
    title: row.title || '',
    subject: row.subject || '数学',
    grade: row.grade || '',
    typeId: row.type_id || '',
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
    type_id: q.typeId,
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
    id: row.id,
    name: row.name,
    icon: row.icon || '📝',
    description: row.description || '',
    createdAt: row.created_at?.slice(0, 10) || '',
    updatedAt: row.updated_at?.slice(0, 10) || '',
  }
}

function rowToTag(row: any): Tag {
  return {
    id: row.id,
    name: row.name,
    count: 0,
    createdAt: row.created_at?.slice(0, 10) || '',
  }
}

function resolveTypeNames() {
  const typeMap = Object.fromEntries(types.map((t) => [t.id, t.name]))
  questions.forEach((q) => {
    q.typeName = typeMap[q.typeId] || ''
  })
}

function computeTagCounts() {
  const counts: Record<string, number> = {}
  questions.forEach((q) => {
    q.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1 })
  })
  tags.forEach((t) => { t.count = counts[t.name] || 0 })
}

function backupToLocal() {
  try {
    localStorage.setItem('talktalk_questions', JSON.stringify(questions))
    localStorage.setItem('talktalk_types', JSON.stringify(types))
    localStorage.setItem('talktalk_tags', JSON.stringify(tags))
  } catch {}
}

// ---------- init: load from Supabase, fallback to localStorage ----------
async function loadFromFallback() {
  questions = JSON.parse(localStorage.getItem('talktalk_questions') || 'null') || JSON.parse(JSON.stringify(initialQuestions))
  types = JSON.parse(localStorage.getItem('talktalk_types') || 'null') || JSON.parse(JSON.stringify(initialTypes))
  tags = JSON.parse(localStorage.getItem('talktalk_tags') || 'null') || JSON.parse(JSON.stringify(initialTags))
  resolveTypeNames()
  computeTagCounts()
  loaded = true
  loading = false
  notify()
}

async function migrateLocalToSupabase() {
  const localQuestions: Question[] = JSON.parse(localStorage.getItem('talktalk_questions') || 'null') || [...initialQuestions]
  const localTypes: QuestionType[] = JSON.parse(localStorage.getItem('talktalk_types') || 'null') || [...initialTypes]
  const localTags: Tag[] = JSON.parse(localStorage.getItem('talktalk_tags') || 'null') || [...initialTags]

  const promises: Promise<any>[] = []
  if (localTypes.length) {
    promises.push(
      supabase.from('question_types').upsert(
        localTypes.map((t) => ({ id: t.id, name: t.name, icon: t.icon || '📝', description: t.description || '' }))
      )
    )
  }
  if (localTags.length) {
    promises.push(
      supabase.from('tags').upsert(localTags.map((t) => ({ id: t.id, name: t.name })))
    )
  }
  if (localQuestions.length) {
    promises.push(
      supabase.from('questions').upsert(localQuestions.map(questionToRow))
    )
  }
  const results = await Promise.allSettled(promises)
  results.forEach((r) => {
    if (r.status === 'rejected') console.warn('migration item failed:', r.reason)
  })
}

async function ensureLoaded() {
  if (loaded || loading) return
  loading = true

  try {
    // Try loading questions first to check if Supabase has data
    const { data: qData, error: qErr } = await supabase
      .from('questions')
      .select('id')
      .limit(1)

    if (qErr || !qData || qData.length === 0) {
      // First run or Supabase error — use fallback, then migrate
      await loadFromFallback()
      // Attempt migration in background
      migrateLocalToSupabase().catch((e) => console.warn('bg migration failed:', e))
      return
    }

    // Load all data from Supabase
    const [qr, tyr, tar] = await Promise.all([
      supabase.from('questions').select('*').order('created_at', { ascending: false }),
      supabase.from('question_types').select('*').order('created_at'),
      supabase.from('tags').select('*').order('created_at'),
    ])

    if (qr.error || tyr.error || tar.error) throw new Error('Supabase load error')

    questions = (qr.data || []).map(rowToQuestion)
    types = (tyr.data || []).map(rowToType)
    tags = (tar.data || []).map(rowToTag)
    resolveTypeNames()
    computeTagCounts()
    backupToLocal()
  } catch (e) {
    console.warn('Supabase init failed, falling back to localStorage:', e)
    await loadFromFallback()
    return
  }

  loaded = true
  loading = false
  notify()
}

// Start loading in background
ensureLoaded()

// ---------- synchronous accessors ----------
export function getQuestions(): Question[] {
  if (!loaded) {
    try {
      const raw = localStorage.getItem('talktalk_questions')
      if (raw) return JSON.parse(raw)
    } catch {}
  }
  return questions
}

export function getTypes(): QuestionType[] {
  if (!loaded) {
    try {
      const raw = localStorage.getItem('talktalk_types')
      if (raw) return JSON.parse(raw)
    } catch {}
  }
  return types
}

export function getTags(): Tag[] {
  if (!loaded) {
    try {
      const raw = localStorage.getItem('talktalk_tags')
      if (raw) return JSON.parse(raw)
    } catch {}
  }
  return tags
}

// ---------- mutations (sync cache first, then async Supabase) ----------

function genId(prefix: string): string {
  return `${prefix}-${String(Date.now()).slice(-6)}`
}

export function addQuestion(data: QuestionForm): Question {
  const id = genId('lesson')
  const now = new Date().toISOString().slice(0, 10)
  const t = types.find((t) => t.id === data.typeId)
  const question: Question = {
    id,
    title: data.title,
    subject: data.subject,
    grade: data.grade,
    typeId: data.typeId,
    typeName: t?.name || '',
    tags: data.tags,
    question: data.question,
    content: { markdown: data.markdown },
    images: data.images,
    htmlDemos: data.htmlDemos,
    status: data.status,
    createdAt: now,
    updatedAt: now,
  }

  // Update cache immediately
  questions = [question, ...questions]
  computeTagCounts()
  backupToLocal()
  notify()

  // Sync to Supabase in background
  supabase.from('questions').insert(questionToRow(question))
    .then(({ error }) => { if (error) console.warn('addQuestion supabase error:', error) })

  return question
}

export function updateQuestion(id: string, data: QuestionForm) {
  const index = questions.findIndex((q) => q.id === id)
  if (index === -1) return
  const t = types.find((t) => t.id === data.typeId)

  // Update cache immediately
  questions[index] = {
    ...questions[index],
    ...data,
    typeName: t?.name || '',
    updatedAt: new Date().toISOString().slice(0, 10),
  }
  computeTagCounts()
  backupToLocal()
  notify()

  // Sync to Supabase in background
  supabase.from('questions').update(questionToRow(questions[index])).eq('id', id)
    .then(({ error }) => { if (error) console.warn('updateQuestion supabase error:', error) })
}

export function deleteQuestion(id: string) {
  // Update cache immediately
  questions = questions.filter((q) => q.id !== id)
  computeTagCounts()
  backupToLocal()
  notify()

  supabase.from('questions').delete().eq('id', id)
    .then(({ error }) => { if (error) console.warn('deleteQuestion supabase error:', error) })
}

export function addType(data: { name: string; description?: string; icon?: string }) {
  const id = data.name.toLowerCase().replace(/\s+/g, '')
  const now = new Date().toISOString().slice(0, 10)
  const t: QuestionType = {
    id,
    name: data.name,
    icon: data.icon || '📝',
    description: data.description || '',
    createdAt: now,
    updatedAt: now,
  }

  types = [...types, t]
  backupToLocal()
  notify()

  supabase.from('question_types').upsert({
    id, name: data.name, icon: data.icon || '📝', description: data.description || '',
  }).then(({ error }) => { if (error) console.warn('addType supabase error:', error) })
}

export function updateType(id: string, data: { name?: string; description?: string }) {
  const index = types.findIndex((t) => t.id === id)
  if (index === -1) return
  const patch: any = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.description !== undefined) patch.description = data.description

  types[index] = { ...types[index], ...patch, updatedAt: new Date().toISOString().slice(0, 10) }
  resolveTypeNames()
  backupToLocal()
  notify()

  supabase.from('question_types').update(patch).eq('id', id)
    .then(({ error }) => { if (error) console.warn('updateType supabase error:', error) })
}

export function deleteType(id: string) {
  types = types.filter((t) => t.id !== id)
  questions = questions.map((q) => q.typeId === id ? { ...q, typeId: '', typeName: '' } : q)
  backupToLocal()
  notify()

  supabase.from('question_types').delete().eq('id', id)
    .then(({ error }) => { if (error) console.warn('deleteType supabase error:', error) })
}

export function addTag(name: string) {
  const id = genId('tag')
  const now = new Date().toISOString().slice(0, 10)
  const t: Tag = { id, name, count: 0, createdAt: now }

  tags = [...tags, t]
  backupToLocal()
  notify()

  supabase.from('tags').upsert({ id, name })
    .then(({ error }) => { if (error) console.warn('addTag supabase error:', error) })
}

export function updateTag(id: string, name: string) {
  const index = tags.findIndex((t) => t.id === id)
  if (index === -1) return

  tags[index] = { ...tags[index], name }
  backupToLocal()
  notify()

  supabase.from('tags').update({ name }).eq('id', id)
    .then(({ error }) => { if (error) console.warn('updateTag supabase error:', error) })
}

export function deleteTag(id: string) {
  tags = tags.filter((t) => t.id !== id)
  backupToLocal()
  notify()

  supabase.from('tags').delete().eq('id', id)
    .then(({ error }) => { if (error) console.warn('deleteTag supabase error:', error) })
}

// ---------- React hook ----------
export function useStore() {
  const [, setTick] = useState(0)

  useMemo(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    // If not loaded yet, trigger re-render when done
    if (!loaded) {
      ensureLoaded().then(() => setTick((t) => t + 1))
    }
    return unsub
  }, [])

  return { questions, types, tags }
}

// ensureLoaded is already in scope for import

