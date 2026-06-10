/**
 * Supabase 服务端客户端（使用 service_role key）
 *
 * 仅在 Vercel Serverless Functions 中使用，不做前端暴露
 */

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const BASE = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : ''

// ============================================================
// 请求封装
// ============================================================

async function request<T>(
  path: string,
  options: {
    method?: string
    body?: any
  } = {}
): Promise<{ data: T | null; error: any }> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { data: null, error: new Error('Supabase admin not configured') }
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: options.method || 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation',
      },
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
// 查询
// ============================================================

export function query<T>(
  table: string,
  options: {
    select?: string
    order?: string
    ascending?: boolean
    limit?: number
    filters?: Record<string, string>
  } = {}
): Promise<{ data: T | null; error: any }> {
  const params = new URLSearchParams()
  params.set('select', options.select || '*')
  if (options.order) {
    params.set('order', `${options.order}.${options.ascending !== false ? 'asc' : 'desc'}`)
  }
  if (options.limit) params.set('limit', String(options.limit))

  const qs = params.toString()
  return request<T>(`/${table}?${qs}`)
}

// ============================================================
// 插入
// ============================================================

export function insert<T>(
  table: string,
  rows: any
): Promise<{ data: T | null; error: any }> {
  return request<T>(`/${table}`, {
    method: 'POST',
    body: Array.isArray(rows) ? rows : [rows],
  })
}

// ============================================================
// 更新（带过滤）
// ============================================================

export function updateWhere<T>(
  table: string,
  filters: Record<string, string>,
  data: any
): Promise<{ data: T | null; error: any }> {
  const qs = Object.entries(filters)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join('&')
  return request<T>(`/${table}?${qs}`, {
    method: 'PATCH',
    body: data,
  })
}

/** 按 ID 更新 */
export function update<T>(
  table: string,
  idColumn: string,
  idValue: any,
  data: any
): Promise<{ data: T | null; error: any }> {
  return request<T>(`/${table}?${idColumn}=eq.${idValue}`, {
    method: 'PATCH',
    body: data,
  })
}

// ============================================================
// 工具
// ============================================================

export function isConfigured(): boolean {
  return !!(SUPABASE_URL && SERVICE_ROLE_KEY)
}

export function getBaseUrl() {
  return BASE
}
