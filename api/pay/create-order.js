/**
 * API 入口：微信支付下单（ESM 版）
 * GET /api/pay/create-order?debug=env  — 环境变量诊断
 * POST /api/pay/create-order           — 创建订单
 */
import { unifiedOrder, isWechatPayConfigured, getConfigStatus } from '../lib/wechat-pay.js'
import { query as supabaseQuery, insert } from '../lib/supabase-admin.js'

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  if (!isWechatPayConfigured()) {
    res.status(500).json({ error: '微信支付未配置完整', config: getConfigStatus() })
    return
  }

  try {
    const { planId } = req.body
    if (!planId) { res.status(400).json({ error: '缺少 planId' }); return }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) { res.status(401).json({ error: '未登录' }); return }
    const accessToken = authHeader.slice(7)

    // 获取用户信息
    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!userRes.ok) { res.status(401).json({ error: 'Token 无效或已过期' }); return }
    const userData = await userRes.json()
    const userId = userData.id

    // 查询套餐
    const { data: plans, error: planError } = await supabaseQuery('plans', { filters: { id: planId }, select: '*', limit: 1 })
    if (planError || !plans || plans.length === 0) { res.status(404).json({ error: '套餐不存在' }); return }
    const plan = plans[0]
    if (plan.status !== 'active') { res.status(400).json({ error: '套餐已下架' }); return }

    const priceInYuan = Number(plan.price)
    if (priceInYuan <= 0) { res.status(400).json({ error: '免费套餐无需支付' }); return }

    // 检查是否已有有效订阅
    const { data: activeSubs } = await supabaseQuery('active_subscriptions', {
      filters: { user_id: userId, plan_id: planId },
      select: 'id',
      limit: 1,
    })
    if (activeSubs && activeSubs.length > 0) {
      res.status(400).json({ error: '该套餐已订阅，无需重复购买' })
      return
    }

    // 检查是否有该套餐的待支付订单（防止重复下单）
    const { data: pendingOrders } = await supabaseQuery('orders', {
      filters: { user_id: userId, plan_id: planId, status: 'pending' },
      select: 'id,order_no,created_at',
      limit: 1,
    })
    if (pendingOrders && pendingOrders.length > 0) {
      // 有未支付的订单，直接返回已存在的信息
      const existing = pendingOrders[0]
      console.log('[pay/create-order] existing pending order:', existing.order_no)
      res.status(200).json({
        orderNo: existing.order_no,
        payment: { mode: 'native', codeUrl: null, message: '有未完成的订单，请先支付或取消' },
      })
      return
    }

    // 创建订单
    const orderNo = `ORD${Date.now()}${String(Math.random()).slice(2, 8)}`
    const { data: order, error: orderError } = await insert('orders', {
      order_no: orderNo, user_id: userId, plan_id: planId, amount: priceInYuan, status: 'pending',
    })
    if (orderError || !order || order.length === 0) { res.status(500).json({ error: '创建订单失败', detail: orderError }); return }

    // 调微信支付统一下单（Native 扫码模式）
    const paymentResult = await unifiedOrder({
      description: `TalkTalk ${plan.name}`,
      outTradeNo: orderNo,
      amount: priceInYuan,
    })

    res.status(200).json({
      orderNo,
      payment: { mode: 'native', codeUrl: paymentResult.codeUrl },
    })
  } catch (e) {
    console.error('[pay/create-order] error:', e)
    res.status(500).json({ error: e.message || '下单失败' })
  }
}
