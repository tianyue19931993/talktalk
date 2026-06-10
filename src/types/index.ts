/** 题型定义 */
export interface QuestionType {
  id: string
  name: string
  description?: string
  icon?: string
  createdAt: string
  updatedAt: string
}

/** 标签定义 */
export interface Tag {
  id: string
  name: string
  count: number
  createdAt: string
}

/** HTML互动演示 */
export interface HtmlDemo {
  title: string
  url: string
}

/** 题目 */
export interface Question {
  id: string
  title: string
  subject: string
  grade: string
  typeId: string
  typeName: string
  tags: string[]
  question: string
  content: {
    markdown: string
  }
  images: string[]
  htmlDemos: HtmlDemo[]
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

/** 创建/编辑题目表单 */
export interface QuestionForm {
  title: string
  subject: string
  grade: string
  typeId: string
  tags: string[]
  question: string
  markdown: string
  images: string[]
  htmlDemos: HtmlDemo[]
  status: 'draft' | 'published'
}

/** 科目 */
export const SUBJECTS = ['数学'] as const
export type Subject = (typeof SUBJECTS)[number]

/** 年级 */
export const GRADES = [
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
] as const
export type Grade = (typeof GRADES)[number]
