// Supabase Auth 原生客户端（不使用 SDK，与 supabase.ts 风格一致）
import type { AuthSession, Profile, Plan, Subscription, Order } from '../types/auth'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const AUTH_BASE = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : ''
const REST_BASE = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : ''

const STORAGE_KEY = 'talktalk_auth'

// ============================================================
// Session 持久化（仅用于 auth token，非业务数据）
// ============================================================

export function saveSession(session: AuthSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {}
}

/** 同步：从 localStorage 读取原始 session（不过期检查） */
export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as AuthSession : null
  } catch {
    return null
  }
}

/** 异步：获取有效 session，过期时自动刷新 */
export async function ensureValidSession(): Promise<AuthSession | null> {
  const stored = getStoredSession()
  if (!stored) return null

  // token 仍有效
  if (!stored.expiresAt || Date.now() < stored.expiresAt * 1000) {
    return stored
  }

  // token 过期 → 用 refresh_token 续期
  if (stored.refreshToken) {
    const { data } = await refreshSession()
    if (data) return data
  }

  // 续期失败
  clearSession()
  return null
}

/** 同步：检查 localStorage 是否有 session（过期也算有，后续走异步刷新） */
export function hasStoredSession(): boolean {
  return getStoredSession() !== null
}

/**
 * 同步：读取 session，过期直接返回 null（简单场景用）
 * 后台启动恢复场景请用 ensureValidSession()
 */
export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (session.expiresAt && Date.now() > session.expiresAt * 1000) {
      return null // 不在这里 clear，留给 ensuresValidSession 做刷新
    }
    return session
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

// ============================================================
// Auth API 请求
// ============================================================

interface AuthResponse<T> {
  data: T | null
  error: string | null
}

async function authRequest<T>(
  path: string,
  options: {
    method?: string
    body?: any
    token?: string
  } = {}
): Promise<AuthResponse<T>> {
  try {
    const url = `${AUTH_BASE}${path}`
    const headers: Record<string, string> = {
      'apikey': SUPABASE_KEY!,
      'Content-Type': 'application/json',
    }
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const text = await res.text()
    if (!res.ok) {
      const msg = text ? JSON.parse(text)?.msg || text : `HTTP ${res.status}`
      return { data: null, error: msg }
    }
    return { data: text ? JSON.parse(text) : null, error: null }
  } catch (e: any) {
    return { data: null, error: e.message || 'Network error' }
  }
}

// ============================================================
// REST API 请求（带用户 token）
// ============================================================

export async function authedRequest<T>(
  path: string,
  options: {
    method?: string
    body?: any
  } = {}
): Promise<AuthResponse<T>> {
  const session = loadSession()
  if (!session) return { data: null, error: 'Not authenticated' }

  try {
    const url = `${REST_BASE}${path}`
    const headers: Record<string, string> = {
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    if (options.method && options.method !== 'GET') {
      headers['Prefer'] = 'return=representation'
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (res.status === 204) return { data: null as any, error: null }

    const text = await res.text()
    if (!text) return { data: null as any, error: null }

    const data = JSON.parse(text)
    if (!res.ok) {
      return { data: null, error: `HTTP ${res.status}: ${data?.message || text}` }
    }
    return { data, error: null }
  } catch (e: any) {
    return { data: null, error: e.message || 'Network error' }
  }
}

// ============================================================
// Auth Operations
// ============================================================

/** 注册 */
export async function signUp(email: string, password: string): Promise<AuthResponse<any>> {
  return authRequest('/signup', {
    method: 'POST',
    body: { email, password },
  })
}

/** 登录 */
export async function signIn(email: string, password: string): Promise<AuthResponse<AuthSession>> {
  const { data, error } = await authRequest<any>('/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  })

  if (error || !data) return { data: null, error }

  const session: AuthSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  }

  saveSession(session)
  return { data: session, error: null }
}

/** 刷新 token */
export async function refreshSession(): Promise<AuthResponse<AuthSession>> {
  const current = getStoredSession()
  if (!current?.refreshToken) return { data: null, error: 'No refresh token' }

  const { data, error } = await authRequest<any>('/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: current.refreshToken },
  })

  if (error || !data) {
    clearSession()
    return { data: null, error }
  }

  const session: AuthSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  }

  saveSession(session)
  return { data: session, error: null }
}

/** 退出 */
export async function signOut(): Promise<void> {
  const session = loadSession()
  if (session) {
    await authRequest('/logout', { method: 'POST', token: session.accessToken })
  }
  clearSession()
}

// ============================================================
// Profile Operations
// ============================================================

/** 获取当前用户 Profile */
export async function getProfile(): Promise<AuthResponse<Profile>> {
  const session = loadSession()
  if (!session) return { data: null, error: 'Not authenticated' }

  const id = session.user.id
  return authedRequest<any[]>(`/profiles?id=eq.${id}`, { method: 'GET' }).then(
    (r) => {
      if (r.error) return { data: null, error: r.error }
      const data = r.data?.[0]
      if (!data) return { data: null, error: 'Profile not found' }
      return {
        data: {
          id: data.id,
          email: data.email,
          nickname: data.nickname,
          avatar: data.avatar,
          role: data.role,
          status: data.status,
          createdAt: data.created_at,
        },
        error: null,
      }
    }
  )
}

/** 更新 Profile */
export async function updateProfile(data: { nickname?: string; avatar?: string }): Promise<AuthResponse<any>> {
  const session = loadSession()
  if (!session) return { data: null, error: 'Not authenticated' }
  return authedRequest(`/profiles?id=eq.${session.user.id}`, {
    method: 'PATCH',
    body: data,
  })
}

// ============================================================
// Plan Operations
// ============================================================

/** 获取所有套餐 */
export async function getPlans(): Promise<AuthResponse<Plan[]>> {
  const { data, error } = await authedRequest<any[]>('/plans?order=sort.asc&status=eq.active', { method: 'GET' })
  if (error) return { data: null, error }
  return {
    data: data?.map(rowToPlan) || [],
    error: null,
  }
}

function rowToPlan(row: any): Plan {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    price: Number(row.price),
    description: row.description || '',
    permissions: row.permissions || [],
    status: row.status,
    sort: row.sort || 0,
    durationDays: row.duration_days || 30,
    createdAt: row.created_at,
  }
}

// ============================================================
// Subscription Operations
// ============================================================

/** 获取当前用户的有效订阅 */
export async function getActiveSubscription(): Promise<AuthResponse<Subscription | null>> {
  const session = loadSession()
  if (!session) return { data: null, error: 'Not authenticated' }

  const { data, error } = await authedRequest<any[]>(
    '/active_subscriptions?user_id=eq.' + session.user.id,
    { method: 'GET' }
  )

  if (error) return { data: null, error }

  if (!data || data.length === 0) return { data: null, error: null }

  const row = data[0]
  return {
    data: {
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id,
      planCode: row.plan_code,
      planName: row.plan_name,
      permissions: row.permissions || [],
      status: row.status,
      startAt: row.start_at,
      expireAt: row.expire_at,
      createdAt: row.created_at,
    },
    error: null,
  }
}

/** 创建订阅（下单成功后调用） */
export async function createSubscription(userId: string, planId: string): Promise<AuthResponse<Subscription>> {
  // 读取套餐信息获取 duration_days
  const { data: planData } = await authedRequest<any[]>('/plans?id=eq.' + planId, { method: 'GET' })
  const plan = planData?.[0]
  const durationDays = plan?.duration_days || 30

  // 先取消旧订阅
  await authedRequest(`/subscriptions?user_id=eq.${userId}&status=eq.active`, {
    method: 'PATCH',
    body: { status: 'cancelled' },
  })

  // 按套餐 duration_days 计算到期时间
  const now = new Date()
  const expireAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

  const { data, error } = await authedRequest<any[]>('/subscriptions', {
    method: 'POST',
    body: {
      user_id: userId,
      plan_id: planId,
      status: 'active',
      start_at: now.toISOString(),
      expire_at: expireAt.toISOString(),
    },
  })

  if (error || !data) return { data: null, error }
  return {
    data: data[0],
    error: null,
  }
}

// ============================================================
// Order Operations
// ============================================================

/** 创建订单（V1 简化：直接标记已支付，等接入真实支付后再改为 pending+回调） */
export async function createOrder(planId: string, amount: number): Promise<AuthResponse<Order>> {
  const session = loadSession()
  if (!session) return { data: null, error: 'Not authenticated' }

  const orderNo = `ORD${Date.now()}${String(Math.random()).slice(2, 8)}`

  const { data, error } = await authedRequest<any[]>('/orders', {
    method: 'POST',
    body: {
      order_no: orderNo,
      user_id: session.user.id,
      plan_id: planId,
      amount,
      status: 'paid',
      paid_at: new Date().toISOString(),
    },
  })

  if (error || !data) return { data: null, error }
  return {
    data: rowToOrder(data[0]),
    error: null,
  }
}

/** 管理员确认订单（标记已支付 + 激活订阅；未来接入真实支付后使用） */
export async function adminConfirmOrder(orderId: string, userId: string, planId: string): Promise<AuthResponse<any>> {
  // 标记订单已支付
  const r = await authedRequest(`/orders?id=eq.${orderId}`, {
    method: 'PATCH',
    body: { status: 'paid', paid_at: new Date().toISOString() },
  })
  if (r.error) return r

  // 创建订阅
  const sub = await createSubscription(userId, planId)
  return sub
}

/** 获取用户订单列表 */
export async function getOrders(): Promise<AuthResponse<Order[]>> {
  const session = loadSession()
  if (!session) return { data: null, error: 'Not authenticated' }

  const { data, error } = await authedRequest<any[]>(
    `/orders?user_id=eq.${session.user.id}&order=created_at.desc`,
    { method: 'GET' }
  )

  if (error) return { data: null, error }
  return {
    data: data?.map(rowToOrder) || [],
    error: null,
  }
}

function rowToOrder(row: any): Order {
  return {
    id: row.id,
    orderNo: row.order_no,
    userId: row.user_id,
    planId: row.plan_id,
    amount: Number(row.amount),
    status: row.status,
    paidAt: row.paid_at || null,
    createdAt: row.created_at,
  }
}

// ============================================================
// Permission Check
// ============================================================

/** 检查当前用户是否有指定权限 */
export function can(permission: string, subscription: Subscription | null): boolean {
  if (!subscription) return false
  return subscription.permissions.includes(permission)
}

/** 是否可查看互动演示 */
export function canViewDemo(subscription: Subscription | null): boolean {
  return can('view_demo', subscription)
}

/** 是否可创建互动演示 */
export function canCreateDemo(subscription: Subscription | null): boolean {
  return can('create_demo', subscription)
}

/** 是否已登录 */
export function isLoggedIn(): boolean {
  return loadSession() !== null
}
