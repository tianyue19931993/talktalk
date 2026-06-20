/**
 * POST /api/upload-html
 *
 * 前端上传 HTML 文件到七牛 Kodo（管理端上传使用）
 * 请求体: { content: "HTML源码", type: "admin"|"user", refId: "题目ID" }
 * 响应:   { success: true, url: "..." } | { success: false, error: "..." }
 */

import crypto from 'crypto'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET ?action=test → 七牛连接测试
  if (req.method === 'GET' && req.query.action === 'test') {
    const ak = process.env.QINIU_ACCESS_KEY
    const sk = process.env.QINIU_SECRET_KEY
    const domain = process.env.QINIU_DOMAIN
    const bucket = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab'
    const uploadHost = process.env.QINIU_UPLOAD_HOST || 'https://up.qiniup.com'

    const result = { configured: !!(ak && sk && domain), ak: ak ? `${ak.slice(0,4)}...` : null, domain, bucket, uploadHost }
    if (!result.configured) {
      return res.status(200).json({ ...result, error: '缺少七牛环境变量', details: { hasAk: !!ak, hasSk: !!sk, hasDomain: !!domain } })
    }

    try {
      function urlsafe(s) { const b = typeof s === 'string' ? Buffer.from(s) : s; return b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') }
      const testKey = `test/${Date.now()}.txt`
      const putPolicy = JSON.stringify({ scope: `${bucket}:${testKey}`, deadline: Math.floor(Date.now()/1000)+3600 })
      const encodedPolicy = urlsafe(putPolicy)
      const sign = crypto.createHmac('sha1', sk).update(encodedPolicy).digest()
      const token = `${ak}:${urlsafe(sign)}:${encodedPolicy}``
      const boundary = `----QiniuTest${Date.now()}`
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="token"\r\n\r\n${token}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="key"\r\n\r\n${testKey}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\nok\r\n`),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ])
      const r = await fetch(uploadHost, { method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }, body })
      const text = await r.text()
      return res.status(200).json({ ...result, uploadStatus: r.status, uploadBody: text.slice(0, 500), testKey })
    } catch (e) {
      return res.status(200).json({ ...result, error: e.message })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  const { content, type, refId } = req.body
  if (!content) return res.status(400).json({ success: false, error: 'content 是必需的' })

  try {
    let url = ''

    const ak = process.env.QINIU_ACCESS_KEY
    const sk = process.env.QINIU_SECRET_KEY
    const domain = process.env.QINIU_DOMAIN
    const bucket = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab'

    if (ak && sk && domain) {
      const folder = type === 'admin' ? 'admin' : 'user'
      const key = `MHTML/${folder}/${refId || 'unknown'}/${Date.now()}.html`

      function urlsafe(s) {
        const b = typeof s === 'string' ? Buffer.from(s) : s
        return b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
      }
      const putPolicy = JSON.stringify({ scope: `${bucket}:${key}`, deadline: Math.floor(Date.now()/1000)+3600 })
      const encodedPolicy = urlsafe(putPolicy)
      const sign = crypto.createHmac('sha1', sk).update(encodedPolicy).digest()
      const token = `${ak}:${urlsafe(sign)}:${encodedPolicy}`

      const boundary = `----QiniuFormBoundary${Date.now()}`
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="token"\r\n\r\n${token}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="key"\r\n\r\n${key}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${Date.now()}.html"\r\nContent-Type: text/html; charset=utf-8\r\n\r\n`),
        Buffer.from(content, 'utf-8'),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ])
      const host = process.env.QINIU_UPLOAD_HOST || 'https://up.qiniup.com'
      const r = await fetch(host, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body,
      })
      if (r.ok) url = `${domain}/${key}`
    }

    if (!url) {
      url = 'data:text/html;charset=utf-8,' + encodeURIComponent(content)
    }
    return res.status(200).json({ success: true, url })
  } catch (e) {
    console.error('[upload-html] error:', e.message)
    return res.status(200).json({ success: false, error: e.message || '上传失败' })
  }
}
