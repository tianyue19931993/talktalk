// GET /api/status - 简易诊断
module.exports = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WECHAT_PAY_APPID=' + (process.env.WECHAT_PAY_APPID || 'NOT_SET'))
}
