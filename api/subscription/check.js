/**
 * GET /api/subscription/check - 检查当前用户的订阅状态（ESM 版）
 *
 * 职责：
 * 1. 检查有效订阅，过期则标记 expired
 * 2. 如果没有订阅，查找待支付订单，尝试向微信同步真实状态
 */
import { query, updateWhere, insert } from '../../server/lib/supabase-admin.js'
import { queryOrder } from '../../server/lib/wechat-pay.js'
import { ensureBasicSubscription, syncGenerationQuotaFromActiveSubscription } from '../../server/lib/membership.js'

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录' })
    return
  }

  try {
    // 获取当前用户
    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': authHeader,
      },
    })
    if (!userRes.ok) { res.status(401).json({ error: 'Token 无效' }); return }
    const userData = await userRes.json()
    const userId = userData.id

    // 1. 查用户的 active 订阅
    const { data: subs } = await query('subscriptions', {
      filters: { user_id: userId, status: 'active' },
      select: 'id,expire_at,plan_id,start_at',
      limit: 1,
    })

    let hasActive = !!(subs && subs.length > 0)

    // 如果已有活跃订阅，检查是否过期
    if (hasActive) {
      const sub = subs[0]
      const now = new Date()
      const expireAt = sub.expire_at ? new Date(sub.expire_at) : null
      if (expireAt && expireAt <= now) {
        await updateWhere('subscriptions', { id: sub.id }, { status: 'expired' })
        console.log('[sub/check] expired:', { userId, subId: sub.id })
        hasActive = false
      }
    }

    // 1.5 没有活跃订阅时，自动补发 basic 会员
    if (!hasActive) {
      const ensured = await ensureBasicSubscription(userId)
      if (ensured) {
        hasActive = true
      }
    } else {
      await syncGenerationQuotaFromActiveSubscription(userId).catch(() => {})
    }

    // 2. 没有活跃订阅 → 查找待支付订单，尝试向微信同步
    if (!hasActive) {
      const { data: pendingOrders } = await query('orders', {
        filters: { user_id: userId, status: 'pending' },
        select: 'order_no,plan_id,created_at',
        limit: 5,
        order: 'created_at',
        ascending: false,
      })

      if (pendingOrders && pendingOrders.length > 0) {
        for (const order of pendingOrders) {
          try {
            const wxResult = await queryOrder(order.order_no)
            if (wxResult.tradeState === 'SUCCESS') {
              // 微信确认已支付 → 同步订单和订阅
              const now = new Date()
              const actualStart = new Date(wxResult.successTime || order.created_at || now)

              // 获取套餐有效期
              const { data: planData } = await query('plans', {
                filters: { id: order.plan_id },
                select: 'duration_days',
                limit: 1,
              })
              const durationDays = (planData && planData[0]?.duration_days) || 30
              const expireAt = new Date(actualStart.getTime() + durationDays * 24 * 60 * 60 * 1000)

              await updateWhere('orders', { order_no: order.order_no }, {
                status: 'paid',
                paid_at: wxResult.successTime || now.toISOString(),
              })

              // 取消旧订阅
              await updateWhere('subscriptions', { user_id: userId, status: 'active' }, { status: 'cancelled' }).catch(() => {})

              // 检查是否已有活跃订阅（防重复）
              const { data: existing } = await query('subscriptions', {
                filters: { user_id: userId, plan_id: order.plan_id, status: 'active' },
                select: 'id',
                limit: 1,
              })

              if (!existing || existing.length === 0) {
                const subResult = await insert('subscriptions', {
                  user_id: userId,
                  plan_id: order.plan_id,
                  status: 'active',
                  start_at: actualStart.toISOString(),
                  expire_at: expireAt.toISOString(),
                })
                if (!subResult.error) {
                  await syncGenerationQuotaFromActiveSubscription(userId).catch(() => {})
                }
                console.log('[sub/check] synced from WeChat:', { userId, orderNo: order.order_no })
              }

              hasActive = true
              break
            }
          } catch {
            // 微信查询失败，继续查下一个订单
            continue
          }
        }
      }
    }

    res.status(200).json({ hasActive })
  } catch (e) {
    console.error('[sub/check] error:', e)
    res.status(500).json({ error: e.message || '检查失败' })
  }
}
