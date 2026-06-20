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
