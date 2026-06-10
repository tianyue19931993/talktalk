import { useState, useMemo } from 'react'
import { Question, QuestionType, Tag, QuestionForm } from '../types'
import initialQuestions from '../data/sampleQuestions'
import initialTypes from '../data/sampleTypes'
import initialTags from '../data/sampleTags'

const STORAGE_KEY_QUESTIONS = 'talktalk_questions'
const STORAGE_KEY_TYPES = 'talktalk_types'
const STORAGE_KEY_TAGS = 'talktalk_tags'

function loadOrInit<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}
  return fallback
}

function persist(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

// Simple global state (using module-level state)
let questions = loadOrInit(STORAGE_KEY_QUESTIONS, [...initialQuestions])
let types = loadOrInit(STORAGE_KEY_TYPES, [...initialTypes])
let tags = loadOrInit(STORAGE_KEY_TAGS, [...initialTags])
let listeners: Array<() => void> = []

function notify() {
  listeners.forEach((fn) => fn())
}

function persistAll() {
  persist(STORAGE_KEY_QUESTIONS, questions)
  persist(STORAGE_KEY_TYPES, types)
  persist(STORAGE_KEY_TAGS, tags)
}

export function subscribe(fn: () => void) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((f) => f !== fn)
  }
}

export function getQuestions() {
  return questions
}

export function getTypes() {
  return types
}

export function getTags() {
  return tags
}

export function addQuestion(data: QuestionForm) {
  const id = `lesson-${String(questions.length + 1).padStart(3, '0')}`
  const now = new Date().toISOString().slice(0, 10)
  const type = types.find((t) => t.id === data.typeId)
  const question: Question = {
    id,
    title: data.title,
    subject: data.subject,
    grade: data.grade,
    typeId: data.typeId,
    typeName: type?.name || '',
    tags: data.tags,
    question: data.question,
    content: { markdown: data.markdown },
    images: data.images,
    htmlDemos: data.htmlDemos,
    status: data.status,
    createdAt: now,
    updatedAt: now,
  }
  questions = [question, ...questions]
  updateTagCounts()
  persistAll()
  notify()
  return question
}

export function updateQuestion(id: string, data: QuestionForm) {
  const index = questions.findIndex((q) => q.id === id)
  if (index === -1) return
  const type = types.find((t) => t.id === data.typeId)
  questions[index] = {
    ...questions[index],
    ...data,
    typeName: type?.name || '',
    updatedAt: new Date().toISOString().slice(0, 10),
  }
  updateTagCounts()
  persistAll()
  notify()
}

export function deleteQuestion(id: string) {
  questions = questions.filter((q) => q.id !== id)
  updateTagCounts()
  persistAll()
  notify()
}

export function addType(data: { name: string; description?: string; icon?: string }) {
  const id = data.name.toLowerCase().replace(/\s+/g, '')
  const now = new Date().toISOString().slice(0, 10)
  types = [
    ...types,
    { id, name: data.name, description: data.description || '', icon: data.icon || '📝', createdAt: now, updatedAt: now },
  ]
  persistAll()
  notify()
}

export function updateType(id: string, data: { name?: string; description?: string }) {
  const index = types.findIndex((t) => t.id === id)
  if (index === -1) return
  types[index] = { ...types[index], ...data, updatedAt: new Date().toISOString().slice(0, 10) }
  persistAll()
  notify()
}

export function deleteType(id: string) {
  types = types.filter((t) => t.id !== id)
  // Also remove type from questions
  questions = questions.map((q) =>
    q.typeId === id ? { ...q, typeId: '', typeName: '' } : q
  )
  persistAll()
  notify()
}

export function addTag(name: string) {
  const id = `tag-${String(tags.length + 1).padStart(2, '0')}`
  tags = [...tags, { id, name, count: 0, createdAt: new Date().toISOString().slice(0, 10) }]
  persistAll()
  notify()
}

export function updateTag(id: string, name: string) {
  const index = tags.findIndex((t) => t.id === id)
  if (index === -1) return
  tags[index] = { ...tags[index], name }
  persistAll()
  notify()
}

export function deleteTag(id: string) {
  tags = tags.filter((t) => t.id !== id)
  persistAll()
  notify()
}

function updateTagCounts() {
  const tagCounts: Record<string, number> = {}
  questions.forEach((q) => {
    q.tags.forEach((tagName) => {
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1
    })
  })
  tags = tags.map((t) => ({ ...t, count: tagCounts[t.name] || 0 }))
}

// React hooks
export function useStore() {
  const [, setTick] = useState(0)

  useMemo(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])

  return { questions, types, tags }
}
