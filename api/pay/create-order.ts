/**
 * POST /api/pay/create-order
 *
 * 创建微信支付订单
 *
 * 请求体: { planId: string }
 * 成功响应: {
 *   orderNo: string,
 *   payment: {
 *     mode: 'native' | 'h5',
 *     codeUrl?: string,
 *     h5Url?: string,
 *     prepayId: string
 *   }
 * }
 *
 * 需要前端在 Authorization header 中传入用户 accessToken
 */

import { unifiedOrder, isWechatPayConfigured, getConfigStatus } from '../lib/wechat-pay'
import { query as supabaseQuery, updateWhere, insert } from '../lib/supabase-admin'

export default async function handler(req: any, res: any) {
  // ============================================================
  // CORS
  // ============================================================
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // ============================================================
  // 检查配置
  // ============================================================
  if (!isWechatPayConfigured()) {
    const status = getConfigStatus()
    res.status(500).json({
      error: '微信支付未配置完整',
      config: status,
      help: '请设置环境变量: WECHAT_PAY_APPID, WECHAT_PAY_MCHID, WECHAT_PAY_API_V3_KEY, WECHAT_PAY_MCH_SERIAL, WECHAT_PAY_PRIVATE_KEY, WECHAT_PAY_NOTIFY_URL',
    })
    return
  }

  try {
    const { planId } = req.body
    if (!planId) {
      res.status(400).json({ error: '缺少 planId' })
      return
    }

    // ============================================================
    // 1. 获取用户信息（从 Auth header）
    // ============================================================
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '未登录' })
      return
    }
    const accessToken = authHeader.slice(7)

    // 用 accessToken 获取用户信息
    const authApiUrl = `${process.env.SUPABASE_URL}/auth/v1/user`
    const userRes = await fetch(authApiUrl, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!userRes.ok) {
      res.status(401).json({ error: 'Token 无效或已过期' })
      return
    }

    const userData = await userRes.json()
    const userId = userData.id

    // ============================================================
    // 2. 查询套餐信息
    // ============================================================
    const { data: plans, error: planError } = await supabaseQuery<any[]>(
      'plans', { filters: { id: planId }, select: '*', limit: 1 }
    )

    if (planError || !plans || plans.length === 0) {
      res.status(404).json({ error: '套餐不存在' })
      return
    }

    const plan = plans[0]
    if (plan.status !== 'active') {
      res.status(400).json({ error: '套餐已下架' })
      return
    }

    const priceInYuan = Number(plan.price)
    if (priceInYuan <= 0) {
      res.status(400).json({ error: '免费套餐无需支付' })
      return
    }

    // ============================================================
    // 3. 在 Supabase 创建订单 (status: pending)
    // ============================================================
    const orderNo = `ORD${Date.now()}${String(Math.random()).slice(2, 8)}`

    const { data: order, error: orderError } = await insert<any[]>('orders', {
      order_no: orderNo,
      user_id: userId,
      plan_id: planId,
      amount: priceInYuan,
      status: 'pending',
    })

    if (orderError || !order || order.length === 0) {
      res.status(500).json({ error: '创建订单失败', detail: orderError })
      return
    }

    // ============================================================
    // 4. 调微信支付统一下单
    // ============================================================
    const userAgent = req.headers['user-agent'] || ''
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent)
    const payerIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1'

    const mode = isMobile ? 'h5' : 'native'

    const paymentResult = await unifiedOrder({
      description: `TalkTalk ${plan.name}`,
      outTradeNo: orderNo,
      amount: priceInYuan,
      payerClientIp: payerIp,
      mode,
    })

    // ============================================================
    // 5. 返回支付参数给前端
    // ============================================================
    res.status(200).json({
      orderNo,
      payment: {
        mode,
        codeUrl: paymentResult.codeUrl,
        h5Url: paymentResult.h5Url,
        prepayId: paymentResult.prepayId,
      },
    })
  } catch (e: any) {
    console.error('[pay/create-order] error:', e)
    res.status(500).json({ error: e.message || '下单失败' })
  }
}
