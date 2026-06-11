/**
 * POST /api/pay/notify - 微信支付回调通知
 *
 * 安全说明：签名验证必须用原始请求体（字节流），不能重新 JSON.stringify。
 * 这里先尝试从请求流读取原始 body，失败时降级使用 req.body。
 */
const { verifyAndDecryptNotify } = require('../lib/wechat-pay');
const { query: supabaseQuery, updateWhere, insert } = require('../lib/supabase-admin');

/** 从请求流读取原始 body（UTF-8） */
function readRawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    // 流已读完但事件未触发时的兜底
    setTimeout(() => resolve(''), 100);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  try {
    // 优先从流读取原始 body（保证签名验签的完整性）
    let rawBody = await readRawBody(req);
    if (!rawBody) {
      // 流已被消费（Vercel 内部 parser），降级使用 parsed body
      rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    const wechatSignature = req.headers['wechatpay-signature'];
    const wechatTimestamp = req.headers['wechatpay-timestamp'];
    const wechatNonce = req.headers['wechatpay-nonce'];
    const wechatSerial = req.headers['wechatpay-serial'];

    if (!wechatSignature || !wechatTimestamp || !wechatNonce || !wechatSerial) {
      res.status(400).json({ code: 'FAIL', message: 'missing headers' });
      return;
    }

    const payResult = await verifyAndDecryptNotify(rawBody, wechatSignature, wechatTimestamp, wechatNonce, wechatSerial);
    const outTradeNo = payResult.out_trade_no;

    if (payResult.trade_state !== 'SUCCESS') {
      res.status(200).json({ code: 'SUCCESS', message: 'accepted' });
      return;
    }

    const { data: orders } = await supabaseQuery('orders', { filters: { order_no: outTradeNo }, select: '*', limit: 1 });
    if (!orders || orders.length === 0) {
      res.status(200).json({ code: 'SUCCESS', message: 'order not found' });
      return;
    }

    const order = orders[0];
    if (order.status === 'paid') {
      res.status(200).json({ code: 'SUCCESS', message: 'already paid' });
      return;
    }

    await updateWhere('orders', { order_no: outTradeNo }, { status: 'paid', paid_at: payResult.success_time || new Date().toISOString() });

    // 取消旧订阅
    await updateWhere('subscriptions', { user_id: order.user_id, status: 'active' }, { status: 'cancelled' }).catch(() => {});

    // 创建新订阅
    const now = new Date();
    const expireAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await insert('subscriptions', {
      user_id: order.user_id, plan_id: order.plan_id, status: 'active',
      start_at: now.toISOString(), expire_at: expireAt.toISOString(),
    });

    console.log('[pay/notify] activated:', { userId: order.user_id, orderNo: outTradeNo, planId: order.plan_id });
    res.status(200).json({ code: 'SUCCESS', message: '支付成功' });
  } catch (e) {
    console.error('[pay/notify] error:', e.message);
    res.status(500).json({ code: 'FAIL', message: e.message || '处理失败' });
  }
};
