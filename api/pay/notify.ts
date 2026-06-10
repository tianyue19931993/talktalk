/**
 * POST /api/pay/notify
 *
 * 微信支付回调通知端点
 *
 * 微信服务器在用户完成支付后调用此接口。
 * 验证签名 → 更新订单 → 激活订阅
 *
 * 需要在商户平台配置此 URL 作为支付通知地址。
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAndDecryptNotify, queryOrder } from '../lib/wechat-pay'
import { query as supabaseQuery, updateWhere, insert } from '../lib/supabase-admin'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 微信支付使用 POST + 纯文本 body
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  try {
    // ============================================================
    // 1. 获取原始请求体和微信签名头
    // ============================================================
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    const wechatSignature = req.headers['wechatpay-signature'] as string
    const wechatTimestamp = req.headers['wechatpay-timestamp'] as string
    const wechatNonce = req.headers['wechatpay-nonce'] as string
    const wechatSerial = req.headers['wechatpay-serial'] as string

    if (!wechatSignature || !wechatTimestamp || !wechatNonce || !wechatSerial) {
      console.warn('[pay/notify] missing WeChat headers:', {
        signature: !!wechatSignature,
        timestamp: !!wechatTimestamp,
        nonce: !!wechatNonce,
        serial: !!wechatSerial,
      })
      res.status(400).json({ code: 'FAIL', message: 'missing headers' })
      return
    }

    // ============================================================
    // 2. 验证签名并解密支付结果
    // ============================================================
    const payResult = await verifyAndDecryptNotify(
      rawBody,
      wechatSignature,
      wechatTimestamp,
      wechatNonce,
      wechatSerial
    )

    const outTradeNo = payResult.out_trade_no

    console.log('[pay/notify] payment received:', {
      outTradeNo,
      transactionId: payResult.transaction_id,
      tradeState: payResult.trade_state,
      total: payResult.amount.total,
    })

    // ============================================================
    // 3. 检查支付状态
    // ============================================================
    if (payResult.trade_state !== 'SUCCESS') {
      console.warn('[pay/notify] trade state not SUCCESS:', payResult.trade_state)
      // 返回成功给微信（不做重复处理）
      res.status(200).json({ code: 'SUCCESS', message: 'accepted' })
      return
    }

    // ============================================================
    // 4. 查询 Supabase 订单
    // ============================================================
    const { data: orders, error: orderQueryError } = await supabaseQuery<any[]>(
      'orders', { filters: { order_no: outTradeNo }, select: '*', limit: 1 }
    )

    if (orderQueryError || !orders || orders.length === 0) {
      console.error('[pay/notify] order not found:', outTradeNo)
      res.status(200).json({ code: 'SUCCESS', message: 'order not found, skipped' })
      return
    }

    const order = orders[0]

    // ============================================================
    // 5. 幂等检查：订单已支付则跳过
    // ============================================================
    if (order.status === 'paid') {
      console.log('[pay/notify] order already paid:', outTradeNo)
      res.status(200).json({ code: 'SUCCESS', message: 'already paid' })
      return
    }

    // ============================================================
    // 6. 更新订单为已支付
    // ============================================================
    const { error: updateError } = await updateWhere('orders', { order_no: outTradeNo }, {
      status: 'paid',
      paid_at: payResult.success_time || new Date().toISOString(),
    })

    if (updateError) {
      console.error('[pay/notify] failed to update order:', updateError)
      res.status(200).json({ code: 'SUCCESS', message: 'update failed, will retry' })
      return
    }

    // ============================================================
    // 7. 取消用户其他有效订阅（同一用户只能有一个有效订阅）
    // ============================================================
    await updateWhere('subscriptions', { user_id: order.user_id, status: 'active' }, {
      status: 'cancelled',
    }).catch((e) => {
      console.warn('[pay/notify] cancel old sub warning:', e.message)
    })

    // ============================================================
    // 8. 创建新订阅（有效期30天）
    // ============================================================
    const now = new Date()
    const expireAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { error: subError } = await insert('subscriptions', {
      user_id: order.user_id,
      plan_id: order.plan_id,
      status: 'active',
      start_at: now.toISOString(),
      expire_at: expireAt.toISOString(),
    })

    if (subError) {
      console.error('[pay/notify] failed to create subscription:', subError)
      // 订单已标记 paid，订阅创建失败需要人工处理
      // 返回成功让微信不重试，后续由人工处理
      res.status(200).json({ code: 'SUCCESS', message: 'order paid, sub creation failed' })
      return
    }

    // ============================================================
    // 9. 返回成功
    // ============================================================
    console.log('[pay/notify] subscription activated:', {
      userId: order.user_id,
      orderNo: outTradeNo,
      planId: order.plan_id,
      expireAt: expireAt.toISOString(),
    })

    res.status(200).json({ code: 'SUCCESS', message: '支付成功' })
  } catch (e: any) {
    console.error('[pay/notify] error:', e.message)
    // 验证失败返回 500，微信会重试
    res.status(500).json({ code: 'FAIL', message: e.message || '处理失败' })
  }
}
