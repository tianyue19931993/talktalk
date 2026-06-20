/**
 * GET /api/test-qiniu
 *
 * 测试七牛环境变量是否就绪，并尝试上传一个测试文件
 */
import crypto from 'crypto'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

  const ak = process.env.QINIU_ACCESS_KEY
  const sk = process.env.QINIU_SECRET_KEY
  const domain = process.env.QINIU_DOMAIN
  const bucket = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab'

  const info = {
    QINIU_ACCESS_KEY: ak ? `已配置 (${ak.slice(0,4)}...)` : '未配置 ❌',
    QINIU_SECRET_KEY: sk ? `已配置 (${sk.slice(0,4)}...)` : '未配置 ❌',
    QINIU_DOMAIN: domain || '未配置 ❌',
    QINIU_BUCKET: bucket,
  }

  if (!ak || !sk || !domain) {
    return res.status(200).json({ success: false, info, error: '环境变量不完整' })
  }

  try {
    const key = `MHTML/test/verify-${Date.now()}.html`
    function urlsafe(s) {
      const b = typeof s === 'string' ? Buffer.from(s) : s
      return b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
    }
    const putPolicy = JSON.stringify({ scope: `${bucket}:${key}`, deadline: Math.floor(Date.now()/1000)+3600 })
    const encodedPolicy = urlsafe(putPolicy)
    const sign = crypto.createHmac('sha1', sk).update(encodedPolicy).digest()
    const token = `${ak}:${urlsafe(sign)}:${encodedPolicy}`

    const boundary = `----QiniuTest${Date.now()}`
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="token"\r\n\r\n${token}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="key"\r\n\r\n${key}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.html"\r\nContent-Type: text/html; charset=utf-8\r\n\r\n`),
      Buffer.from('<html><body>test</body></html>', 'utf-8'),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])

    const host = process.env.QINIU_UPLOAD_HOST || 'https://up.qiniup.com'
    const response = await fetch(host, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    })

    const respBody = await response.text().catch(() => '(无法读取响应)')

    return res.status(200).json({
      success: response.ok,
      info,
      upload: {
        status: response.status,
        body: respBody.slice(0, 500),
        key,
        url: response.ok ? `${domain}/${key}` : null,
      },
    })
  } catch (e) {
    return res.status(200).json({
      success: false,
      info,
      error: `代码错误: ${e.message}`,
    })
  }
}
