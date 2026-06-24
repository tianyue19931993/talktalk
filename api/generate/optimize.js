/**
 * POST /api/generate/optimize
 *
 * 根据用户建议优化现有 HTML 演示。
 * 不走 analysis_json 和 question_types 的 prompt，
 * 直接在最近一次生成的 HTML 基础上，结合用户修改意见调 AI 优化。
 *
 * 请求体: { demoId: string, suggestions: string }
 * 响应:   { success: true, demoId: string, htmlUrl: string }
 *        | { success: false, error: string }
 */

import { getSupabaseEnv } from '../../server/lib/supabase-env.js'
import crypto from 'crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const aiFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../server/lib/ai.js')
const aiStamp = fs.statSync(aiFile).mtimeMs
const { callAI } = await import(`${pathToFileURL(aiFile).href}?t=${aiStamp}`)

const { url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY } = getSupabaseEnv()

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  const { demoId, suggestions } = req.body
  if (!demoId || !suggestions) {
    return res.status(400).json({ success: false, error: 'demoId 和 suggestions 是必需的' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase not configured' })
  }

  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    Prefer: 'return=representation',
  }

  try {
    // 1. 加载最近一次生成的 demo
    const demoRes = await fetch(
      `${SUPABASE_URL}/rest/v1/question_demos?id=eq.${demoId}`,
      { headers: { ...headers, Prefer: undefined } }
    )
    if (!demoRes.ok) throw new Error(`加载 demo 失败: ${demoRes.status}`)
    const demos = await demoRes.json()
    const latestDemo = demos?.[0]
    if (!latestDemo) throw new Error('未找到该演示记录')
    if (!latestDemo.html_url) throw new Error('该演示没有 HTML 内容')

    // 2. 从 data URL 中提取 HTML 源码
    let currentHtml = ''
    if (latestDemo.html_url.startsWith('data:text/html')) {
      currentHtml = decodeURIComponent(latestDemo.html_url.split(',')[1] || '')
    }

    if (!currentHtml.trim()) throw new Error('无法读取 HTML 内容')

    // 3. 调 AI 优化 HTML
    const aiResult = await callAI({
      systemPrompt: '你是一个专业的前端工程师。用户会给你一个现有的 HTML 互动演示页面，以及他们的修改意见。请根据修改意见优化这个 HTML 文件。\n\n要求：\n- 保持原有交互逻辑和功能\n- 根据修改意见改进样式、布局或内容\n- 输出完整的 HTML 文件（包含 DOCTYPE html 标签）\n- 纯 HTML+CSS+JS，不要 React/Angular/Vue\n- 响应式设计，移动端适配\n- 使用中文',
      prompt: `以下是现有的 HTML 演示代码：\n\n\`\`\`html\n${currentHtml.slice(0, 30000)}\n\`\`\`\n\n用户的修改意见：\n${suggestions}\n\n请根据上述意见优化这个 HTML 文件，输出完整的 HTML 代码。`,
      temperature: 0.6,
      maxTokens: 12000,
      timeoutSeconds: 60,
    })

    if (!aiResult.success || !aiResult.content) {
      return res.status(200).json({ success: false, error: 'AI 优化失败，请重试' })
    }

    // 4. 清理 HTML
    const startIdx = aiResult.content.search(/<!DOCTYPE\s+html|<html[^>]*>/i)
    const rawHtml = startIdx === -1 ? aiResult.content.trim() : aiResult.content.slice(startIdx).trim()
    const htmlEnd = rawHtml.search(/<\/html>\s*/i)
    const optimizedHtml = htmlEnd !== -1 ? rawHtml.slice(0, htmlEnd + 7) : rawHtml

    // 5. 存入存储（优先 Kodo，降级 data:URL）
    let htmlUrl = ''
    const ak = process.env.QINIU_ACCESS_KEY
    const sk = process.env.QINIU_SECRET_KEY
    const domain = process.env.QINIU_DOMAIN
    const bucket = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab'
    if (ak && sk && domain) {
      try {
        const key = `MHTML/user/${latestDemo.question_id}/${Date.now()}.html`
        function urlsafe(s) {
          const b = typeof s === 'string' ? Buffer.from(s) : s
          return b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_')
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
          Buffer.from(optimizedHtml, 'utf-8'),
          Buffer.from(`\r\n--${boundary}--\r\n`),
        ])
        const host = process.env.QINIU_UPLOAD_HOST || 'https://up.qiniup.com'
        const r = await fetch(host, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
          body,
        })
        if (r.ok) htmlUrl = `${domain}/${key}`
      } catch { /* 静默降级 */ }
    }
    if (!htmlUrl) {
      htmlUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(optimizedHtml)
    }

    // 6. 存入 question_demos（新记录）
    const newTitle = `${latestDemo.title || '演示'}_优化`
    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/question_demos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question_id: latestDemo.question_id,
        html_url: htmlUrl,
        title: newTitle,
      }),
    })
    if (!saveRes.ok) throw new Error('保存优化演示失败')
    const saved = await saveRes.json()
    const newDemo = saved?.[0] || {}

    return res.status(200).json({
      success: true,
      demoId: newDemo.id,
      htmlUrl,
    })
  } catch (e) {
    console.error('[generate/optimize] error:', e.message)
    return res.status(200).json({
      success: false,
      error: e.message || '优化失败',
    })
  }
}
