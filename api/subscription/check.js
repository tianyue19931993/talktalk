/**
 * GET /api/subscription/check - 检查当前用户的订阅是否过期（ESM 版）
 * 过期则自动标记为 expired
 */
import { query, updateWhere } from '../lib/supabase-admin.js'

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
    // 查当前用户的有效订阅
    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': authHeader,
      },
    })
    if (!userRes.ok) { res.status(401).json({ error: 'Token 无效' }); return }
    const userData = await userRes.json()
    const userId = userData.id

    // 查用户的 active 订阅
    const { data: subs } = await query('subscriptions', {
      filters: { user_id: userId, status: 'active' },
      select: 'id,expire_at',
      limit: 1,
    })

    if (!subs || subs.length === 0) {
      return res.status(200).json({ hasActive: false })
    }

    const sub = subs[0]
    const now = new Date()
    const expireAt = sub.expire_at ? new Date(sub.expire_at) : null

    if (expireAt && expireAt <= now) {
      // 已过期 → 标记为 expired
      await updateWhere('subscriptions', { id: sub.id }, { status: 'expired' })
      console.log('[sub/check] expired:', { userId, subId: sub.id })
      return res.status(200).json({ hasActive: false, expired: true })
    }

    res.status(200).json({ hasActive: true })
  } catch (e) {
    console.error('[sub/check] error:', e)
    res.status(500).json({ error: e.message || '检查失败' })
  }
}
