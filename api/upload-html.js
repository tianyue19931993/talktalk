/**
 * POST /api/upload-html
 *
 * 前端上传 HTML 文件到七牛 Kodo（管理端上传使用）
 * 请求体: { content: "HTML源码", type: "admin"|"user", refId: "题目ID" }
 * 响应:   { success: true, url: "..." } | { success: false, error: "..." }
 */

import { uploadHtml, isQiniuConfigured } from './lib/qiniu.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  if (!isQiniuConfigured()) {
    return res.status(200).json({ success: false, error: '七牛存储未配置' })
  }

  const { content, type, refId } = req.body
  if (!content) return res.status(400).json({ success: false, error: 'content 是必需的' })

  try {
    const folder = type === 'admin' ? 'admin' : 'user'
    const key = `MHTML/${folder}/${refId || 'unknown'}/${Date.now()}.html`
    const url = await uploadHtml(content, key)
    return res.status(200).json({ success: true, url, key })
  } catch (e) {
    console.error('[upload-html] error:', e.message)
    return res.status(200).json({ success: false, error: e.message || '上传失败' })
  }
}
