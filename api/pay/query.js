/**
 * GET /api/pay/query - 查询订单支付状态（ESM 版）
 */
import { query as supabaseQuery } from '../lib/supabase-admin.js'

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) { res.status(401).json({ error: '未登录' }); return }

  try {
    const orderNo = req.query?.orderNo || ''
    if (!orderNo) { res.status(400).json({ error: '缺少 orderNo' }); return }

    const { data: orders, error } = await supabaseQuery('orders', { filters: { order_no: orderNo }, select: 'status,paid_at,created_at', limit: 1 })
    if (error || !orders || orders.length === 0) { res.status(404).json({ error: '订单不存在' }); return }

    const order = orders[0]
    res.status(200).json({ status: order.status, paidAt: order.paid_at || null, createdAt: order.created_at })
  } catch (e) {
    console.error('[pay/query] error:', e)
    res.status(500).json({ error: e.message || '查询失败' })
  }
}
