/** 用户角色 */
export type UserRole = 'user' | 'admin'

/** 用户状态 */
export type UserStatus = 'active' | 'disabled'

/** 用户 Profile（对应 profiles 表） */
export interface Profile {
  id: string
  email: string | null
  nickname: string | null
  avatar: string | null
  role: UserRole
  status: UserStatus
  createdAt: string
}

/** 套餐（对应 plans 表） */
export interface Plan {
  id: string
  code: string
  name: string
  price: number
  description: string
  permissions: string[]
  status: string
  sort: number
  durationDays: number
  createdAt: string
}

/** 订阅（对应 subscriptions 表） */
export interface Subscription {
  id: string
  userId: string
  planId: string
  planCode: string
  planName: string
  permissions: string[]
  status: 'active' | 'expired' | 'cancelled'
  startAt: string
  expireAt: string | null
  createdAt: string
}

/** 订单（对应 orders 表） */
export interface Order {
  id: string
  orderNo: string
  userId: string
  planId: string
  amount: number
  status: 'pending' | 'paid' | 'cancelled' | 'refunded'
  paidAt: string | null
  createdAt: string
}

/** Supabase Auth 会话 */
export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: {
    id: string
    email: string | null
  }
}

/** HTML 互动演示（复用，与 index.ts 中保持一致） */
export interface UserHtmlDemo {
  title: string
  url: string
}

/** 用户录入的题目（与题库 questions 表区分） */
export interface UserQuestion {
  id: string
  userId: string
  questionText: string
  htmlDemos: UserHtmlDemo[]
  status: 'pending' | 'completed' | 'uploaded'
  createdAt: string
  updatedAt: string
}

/** 权限标识常量 */
export const PERMISSIONS = {
  VIEW_DEMO: 'view_demo',
  CREATE_DEMO: 'create_demo',
} as const
