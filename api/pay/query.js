/**
 * GET /api/pay/query - 查询订单支付状态（ESM 版）
 * 支持通过微信支付 API 重新查询以确认状态
 */
import { query as supabaseQuery, updateWhere, insert } from '../lib/supabase-admin.js'
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
      select: 'status,paid_at,user_id,plan_id,amount,created_at',
      limit: 1,
    })

    if (error || !orders || orders.length === 0) {
      res.status(404).json({ error: '订单不存在' })
      return
    }

    const order = orders[0]

    // 如果本地状态是 pending，尝试向微信支付重新查询实际状态
    if (order.status === 'pending') {
      try {
        const wxResult = await queryOrder(orderNo)
        if (wxResult.tradeState === 'SUCCESS') {
          // 微信说已支付 → 更新订单和订阅
          const now = new Date()

          await updateWhere('orders', { order_no: orderNo }, {
            status: 'paid',
            paid_at: wxResult.successTime || now.toISOString(),
          })

          // 取消旧订阅（幂等操作）
          await updateWhere('subscriptions', { user_id: order.user_id, status: 'active' }, { status: 'cancelled' }).catch(() => {})

          // 防重复检查：确认没有活跃订阅再创建
          const { data: existingSub } = await supabaseQuery('subscriptions', {
            filters: { user_id: order.user_id, plan_id: order.plan_id, status: 'active' },
            select: 'id',
            limit: 1,
          })

          // 用微信支付成功时间或订单创建时间作为订阅开始日期
          const actualStart = new Date(wxResult.successTime || order.created_at || now)
          const expireAt = new Date(actualStart.getTime() + 30 * 24 * 60 * 60 * 1000)

          if (!existingSub || existingSub.length === 0) {
            const subResult = await insert('subscriptions', {
              user_id: order.user_id,
              plan_id: order.plan_id,
              status: 'active',
              start_at: actualStart,
              expire_at: expireAt.toISOString(),
            })
            if (subResult.error) {
              console.error('[pay/query] create subscription failed:', subResult.error)
            }
          } else {
            console.log('[pay/query] subscription already exists, skip creation')
          }

          console.log('[pay/query] synced from WeChat:', { orderNo, userId: order.user_id })
          return res.status(200).json({
            status: 'paid',
            paidAt: wxResult.successTime || now.toISOString(),
            syncFromWechat: true,
          })
        }
      } catch (e) {
        console.error('[pay/query] WeChat fallback error:', e)
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
