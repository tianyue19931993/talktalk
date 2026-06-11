// GET /api/status - 简易健康检查 + 环境变量诊断
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      WECHAT_PAY_APPID: process.env.WECHAT_PAY_APPID || '(not set)',
      WECHAT_PAY_MCHID: process.env.WECHAT_PAY_MCHID ? '***' : '(not set)',
      WECHAT_PAY_API_V3_KEY: process.env.WECHAT_PAY_API_V3_KEY ? '***' : '(not set)',
      WECHAT_PAY_MCH_SERIAL: process.env.WECHAT_PAY_MCH_SERIAL ? '***' : '(not set)',
      WECHAT_PAY_PRIVATE_KEY: process.env.WECHAT_PAY_PRIVATE_KEY ? '***' : '(not set)',
      WECHAT_PAY_NOTIFY_URL: process.env.WECHAT_PAY_NOTIFY_URL || '(not set)',
      SUPABASE_URL: process.env.SUPABASE_URL ? '***' : '(not set)',
    },
  })
}
