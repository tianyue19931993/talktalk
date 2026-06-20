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

import { callAI } from '../lib/ai.js'
import { uploadHtml, isQiniuConfigured } from '../../lib/qiniu.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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
      maxTokens: 8192,
      timeoutSeconds: 30,
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
    if (isQiniuConfigured()) {
      try {
        const key = `MHTML/user/${latestDemo.question_id}/${Date.now()}.html`
        htmlUrl = await uploadHtml(optimizedHtml, key)
      } catch (e) {
        console.warn('[optimize] Kodo upload failed, falling back to data:URL:', e.message)
      }
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
