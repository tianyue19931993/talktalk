// 自包含测试函数，不依赖任何文件
module.exports = (req, res) => {
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
