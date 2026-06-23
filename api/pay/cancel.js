/**
 * POST /api/pay/cancel
 *
 * 取消待支付订单（使用 service_role key 绕过 RLS）
 */
import { getSupabaseEnv } from '../../server/lib/supabase-env.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY } = getSupabaseEnv()

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  try {
    const { orderId } = req.body
    if (!orderId) return res.status(400).json({ error: '缺少 orderId' })

    // 验证用户身份：从 token 获取 user_id
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录' })
    }
    const accessToken = authHeader.slice(7)

    // 获取用户信息
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    if (!userRes.ok) return res.status(401).json({ error: 'Token 无效或已过期' })
    const userData = await userRes.json()
    const userId = userData.id

    // 验证订单属于当前用户
    const orderCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=id,user_id,status`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    )
    if (!orderCheck.ok) return res.status(500).json({ error: '查询订单失败' })
    const orders = await orderCheck.json()
    const order = orders?.[0]
    if (!order) return res.status(404).json({ error: '订单不存在' })
    if (order.user_id !== userId) return res.status(403).json({ error: '无权操作此订单' })
    if (order.status !== 'pending') return res.status(400).json({ error: '该订单状态不允许取消' })

    // 使用 service_role key 更新订单状态
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    })

    if (!updateRes.ok) {
      const err = await updateRes.text()
      return res.status(500).json({ error: `取消失败: ${err}` })
    }

    return res.status(200).json({ success: true })
  } catch (e) {
    console.error('[pay/cancel] error:', e.message)
    return res.status(500).json({ error: e.message || '取消失败' })
  }
}
