import { getSupabaseEnv } from '../../server/lib/supabase-env.js'

/**
 * POST /api/auth/reset-password
 *
 * 直接重置密码（无需邮件验证）。
 * 需要用户知道邮箱，服务端用 service_role key 调用 Supabase Admin API 更新密码。
 *
 * 请求体: { email: string, password: string }
 * 响应:   { success: true } | { success: false, error: string }
 */

const { url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY } = getSupabaseEnv()

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase not configured' })
  }

  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email 和 password 是必需的' })
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: '密码至少 6 位' })
  }

  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }

  try {
    // 1. 查找用户 — 先尝试带 filter 查询
    const searchRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?filter=email&value=${encodeURIComponent(email)}`,
      { headers }
    )
    let users = []
    if (searchRes.ok) {
      const searchData = await searchRes.json()
      users = searchData?.users || []
    }

    // 如果 filter 查询没结果，全量拉取手动匹配
    if (users.length === 0) {
      const allRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers })
      if (allRes.ok) {
        const allData = await allRes.json()
        users = (allData?.users || []).filter((u) => u.email === email.toLowerCase())
      }
    }

    const user = users[0]
    if (!user) {
      return res.status(200).json({ success: false, error: '该邮箱未注册' })
    }

    // 2. 更新密码
    const updateRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ password }),
      }
    )
    if (!updateRes.ok) {
      const text = await updateRes.text()
      return res.status(200).json({ success: false, error: `重置失败: ${updateRes.status}` })
    }

    return res.status(200).json({ success: true })
  } catch (e) {
    console.error('[reset-password] error:', e.message)
    return res.status(200).json({ success: false, error: e.message || '重置失败' })
  }
}
