// Supabase REST API 原生客户端（不使用 SDK，大幅减少包体积）

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const IS_CONFIGURED = !!(SUPABASE_URL && SUPABASE_KEY)

const BASE = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : ''

/** 通用 REST 请求 */
async function request<T>(
  path: string,
  options: {
    method?: string
    body?: any
    params?: Record<string, string>
    signal?: AbortSignal
  } = {}
): Promise<{ data: T | null; error: any }> {
  if (!IS_CONFIGURED) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  try {
    const url = new URL(`${BASE}${path}`)
    if (options.params) {
      Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v))
    }

    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'apikey': SUPABASE_KEY!,
        'Authorization': `Bearer ${SUPABASE_KEY!}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.method && options.method !== 'GET' ? { 'Prefer': 'return=representation' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })

    if (res.status === 204) return { data: null as any, error: null }

    const text = await res.text()
    if (!text) return { data: null as any, error: null }

    const data = JSON.parse(text)
    if (!res.ok) {
      return { data: null, error: new Error(`HTTP ${res.status}: ${data?.message || text}`) }
    }
    return { data, error: null }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return { data: null, error: new Error('Request timed out') }
    }
    return { data: null, error: e }
  }
}

/** 带超时的查询 */
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
  const params: Record<string, string> = {
    select: options.select || '*',
  }
  if (options.order) {
    params.order = `${options.order}.${options.ascending !== false ? 'asc' : 'desc'}`
  }
  if (options.limit) params.limit = String(options.limit)
  if (options.filters) {
    Object.entries(options.filters).forEach(([k, v]) => {
      params[k] = `eq.${v}`
    })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)

  return request<T>(`/${table}?${new URLSearchParams({ select: params.select, ...params }).toString()}`, {
    params,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))
}

/** 插入 */
export function insert<T>(
  table: string,
  rows: any
): Promise<{ data: T | null; error: any }> {
  return request<T>(`/${table}`, {
    method: 'POST',
    body: Array.isArray(rows) ? rows : [rows],
  })
}

/** 更新 */
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

/** 删除 */
export function remove<T>(
  table: string,
  idColumn: string,
  idValue: any
): Promise<{ data: T | null; error: any }> {
  return request<T>(`/${table}?${idColumn}=eq.${idValue}`, {
    method: 'DELETE',
  })
}

export function getBaseUrl() { return BASE }
export function isConfigured() { return IS_CONFIGURED }
