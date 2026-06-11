// api/debug.js - ESM 写法
export default (req, res) => {
  const data = {
    ok: true,
    time: new Date().toISOString(),
    node: process.version,
    method: req.method,
    appid: process.env.WECHAT_PAY_APPID || '(not set)',
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}
