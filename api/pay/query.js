/**
 * GET /api/pay/query - 查询订单支付状态（ESM 版）
 * 支持通过微信支付 API 重新查询以确认状态
 */
import { query as supabaseQuery } from '../lib/supabase-admin.js'
import { queryOrder } from '../lib/wechat-pay.js'

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

    // 先从 Supabase 查本地订单状态
    const { data: orders, error } = await supabaseQuery('orders', {
      filters: { order_no: orderNo },
      select: 'status,paid_at,amount,created_at',
      limit: 1,
    })

    if (error || !orders || orders.length === 0) {
      // 本地没有此订单
      res.status(404).json({ error: '订单不存在' })
      return
    }

    const order = orders[0]

    // 如果本地状态是 pending，尝试向微信支付重新查询实际状态
    if (order.status === 'pending') {
      try {
        const wxResult = await queryOrder(orderNo)
        if (wxResult.tradeState === 'SUCCESS') {
          // 微信说已支付，但本地未更新 → 尝试手动更新
          const { updateWhere } = await import('../lib/supabase-admin.js')
          await updateWhere('orders', { order_no: orderNo }, {
            status: 'paid',
            paid_at: wxResult.successTime || new Date().toISOString(),
          })

          // 激活订阅
          const { data: orderRows } = await supabaseQuery('orders', {
            filters: { order_no: orderNo },
            select: 'user_id,plan_id',
            limit: 1,
          })
          if (orderRows && orderRows.length > 0) {
            const row = orderRows[0]
            await updateWhere('subscriptions', { user_id: row.user_id, status: 'active' }, { status: 'cancelled' }).catch(() => {})
            const { insert } = await import('../lib/supabase-admin.js')
            const now = new Date()
            const expireAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            await insert('subscriptions', {
              user_id: row.user_id,
              plan_id: row.plan_id,
              status: 'active',
              start_at: now.toISOString(),
              expire_at: expireAt.toISOString(),
            })
          }

          return res.status(200).json({
            status: 'paid',
            paidAt: wxResult.successTime || new Date().toISOString(),
            syncFromWechat: true,
          })
        }
      } catch {
        // 微信查询失败，忽略，返回本地状态
      }
    }

    res.status(200).json({
      status: order.status,
      paidAt: order.paid_at || null,
      createdAt: order.created_at,
    })
  } catch (e) {
    console.error('[pay/query] error:', e)
    res.status(500).json({ error: e.message || '查询失败' })
  }
}
