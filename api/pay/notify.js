/**
 * POST /api/pay/notify - 微信支付回调通知（ESM 版）
 */
import { verifyAndDecryptNotify } from '../lib/wechat-pay.js'
import { query as supabaseQuery, updateWhere, insert } from '../lib/supabase-admin.js'

/** 从请求流读取原始 body（UTF-8） */
function readRawBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    setTimeout(() => resolve(''), 100)
  })
}

export default async (req, res) => {
  if (req.method !== 'POST') { res.status(405).end(); return }

  try {
    let rawBody = await readRawBody(req)
    if (!rawBody) {
      rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    }

    const wechatSignature = req.headers['wechatpay-signature']
    const wechatTimestamp = req.headers['wechatpay-timestamp']
    const wechatNonce = req.headers['wechatpay-nonce']
    const wechatSerial = req.headers['wechatpay-serial']

    if (!wechatSignature || !wechatTimestamp || !wechatNonce || !wechatSerial) {
      res.status(400).json({ code: 'FAIL', message: 'missing headers' })
      return
    }

    const payResult = await verifyAndDecryptNotify(rawBody, wechatSignature, wechatTimestamp, wechatNonce, wechatSerial)
    const outTradeNo = payResult.out_trade_no

    if (payResult.trade_state !== 'SUCCESS') {
      res.status(200).json({ code: 'SUCCESS', message: 'accepted' })
      return
    }

    const { data: orders } = await supabaseQuery('orders', { filters: { order_no: outTradeNo }, select: '*', limit: 1 })
    if (!orders || orders.length === 0) {
      res.status(200).json({ code: 'SUCCESS', message: 'order not found' })
      return
    }

    const order = orders[0]
    if (order.status === 'paid') {
      res.status(200).json({ code: 'SUCCESS', message: 'already paid' })
      return
    }

    await updateWhere('orders', { order_no: outTradeNo }, { status: 'paid', paid_at: payResult.success_time || new Date().toISOString() })

    await updateWhere('subscriptions', { user_id: order.user_id, status: 'active' }, { status: 'cancelled' }).catch(() => {})

    // 防重复检查：确认没有活跃订阅再创建
    const { data: existingSub } = await supabaseQuery('subscriptions', {
      filters: { user_id: order.user_id, plan_id: order.plan_id, status: 'active' },
      select: 'id',
      limit: 1,
    })

    if (!existingSub || existingSub.length === 0) {
      // 获取套餐有效期
      const { data: planData } = await supabaseQuery('plans', {
        filters: { id: order.plan_id },
        select: 'duration_days',
        limit: 1,
      })
      const durationDays = (planData && planData[0]?.duration_days) || 30

      // 用微信支付成功时间作为订阅开始日期
      const actualStart = new Date(payResult.success_time || new Date())
      const expireAt = new Date(actualStart.getTime() + durationDays * 24 * 60 * 60 * 1000)
      await insert('subscriptions', {
        user_id: order.user_id, plan_id: order.plan_id, status: 'active',
        start_at: actualStart.toISOString(), expire_at: expireAt.toISOString(),
      })
      console.log('[pay/notify] activated:', { userId: order.user_id, orderNo: outTradeNo, planId: order.plan_id })
    } else {
      console.log('[pay/notify] subscription already exists, skip creation')
    }

    res.status(200).json({ code: 'SUCCESS', message: 'success' })
  } catch (e) {
    console.error('[pay/notify] error:', e)
    res.status(200).json({ code: 'FAIL', message: e.message || 'notify failed' })
  }
}
