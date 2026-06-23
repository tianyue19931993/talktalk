/**
 * Supabase 服务端客户端（使用 service_role key）- ESM 版
 */
import { getSupabaseEnv } from './supabase-env.js'

const { url: SUPABASE_URL, serviceRoleKey: SERVICE_ROLE_KEY } = getSupabaseEnv()
const BASE = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : ''

async function request(path, options = {}) {
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

    if (res.status === 204) return { data: null, error: null }

    const text = await res.text()
    if (!text) return { data: null, error: null }

    const data = JSON.parse(text)
    if (!res.ok) return { data: null, error: `HTTP ${res.status}: ${data?.message || text}` }
    return { data, error: null }
  } catch (e) {
    return { data: null, error: e.message || 'Network error' }
  }
}

export function query(table, options = {}) {
  const params = new URLSearchParams()
  params.set('select', options.select || '*')
  if (options.order) params.set('order', `${options.order}.${options.ascending !== false ? 'asc' : 'desc'}`)
  if (options.limit) params.set('limit', String(options.limit))
  if (options.filters) {
    Object.entries(options.filters).forEach(([k, v]) => {
      params.set(k, `eq.${String(v)}`)
    })
  }
  return request(`/${table}?${params.toString()}`)
}

export function insert(table, rows) {
  return request(`/${table}`, { method: 'POST', body: Array.isArray(rows) ? rows : [rows] })
}

export function updateWhere(table, filters, data) {
  const qs = Object.entries(filters).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&')
  return request(`/${table}?${qs}`, { method: 'PATCH', body: data })
}

export function update(table, idColumn, idValue, data) {
  return request(`/${table}?${idColumn}=eq.${idValue}`, { method: 'PATCH', body: data })
}
