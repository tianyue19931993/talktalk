/**
 * POST /api/pay/notify - 微信支付回调通知
 */
const { verifyAndDecryptNotify } = require('../lib/wechat-pay');
const { query: supabaseQuery, updateWhere, insert } = require('../lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
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
