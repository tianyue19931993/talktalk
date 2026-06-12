/**
 * POST /api/generate/demo
 *
 * 用户点击"立即生成"或"重新生成"时调用的 API。
 * 完整的 AI 生成链路：分析题型 → 结构化分析 → 生成 HTML → 存入数据库。
 *
 * 请求体：
 *   { questionId: string, regenerate?: boolean }
 *
 * 响应：
 *   { success: true, demoId: string, htmlUrl: string }
 *   或 { success: false, error: string }
 */

import { callAI } from '../lib/ai.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  const { questionId, regenerate } = req.body
  if (!questionId) {
    return res.status(400).json({ success: false, error: 'questionId is required' })
  }

  // 辅助：更新 user_questions（不 return representation，不抛错）
  async function fetchUserQuestionPatch(id, body) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/user_questions?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch { /* best effort */ }
  }

  try {

    // 验证 Supabase 配置
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' })
    }

    const headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Prefer': 'return=representation',
    }

    // ============================================================
    // Step 1: 加载用户题目
    // ============================================================
    const questionRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_questions?id=eq.${questionId}`,
      { headers: { ...headers, Prefer: undefined } }
    )
    if (!questionRes.ok) throw new Error(`加载题目失败: ${questionRes.status}`)
    const questions = await questionRes.json()
    const question = questions?.[0]
    if (!question) throw new Error('题目不存在')

    let questionTypeId = question.question_type_id
    let questionTypeName = question.question_type || ''
    let analysisJson = question.analysis_json || {}

    // ============================================================
    // Step 2-3: 首次生成 → AI 识别题型 + 获取 prompt
    // ============================================================
    if (!regenerate || !questionTypeId) {
      // 加载所有可用题型
      const typesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/question_types?order=id.asc`,
        { headers: { ...headers, Prefer: undefined } }
      )
      if (!typesRes.ok) throw new Error('加载题型失败')
      const allTypes = await typesRes.json()

      // AI 识别题型（简单任务，5s 超时）
      const typeNames = allTypes.map((t) => t.name).join('、')
      const identifyResult = await callAI({
        prompt: `题目：${question.question_text}\n\n可用题型：${typeNames}\n\n请判断这道题属于以上哪种题型，只返回题型名称，不要多余文字。`,
        temperature: 0.3,
        maxTokens: 50,
        timeoutSeconds: 5,
      })
      if (!identifyResult.success) {
        // AI 调用失败 → 保存题目为 pending，带具体错误信息
        console.error('[generate/demo] AI 识别失败:', identifyResult.error)
        await fetchUserQuestionPatch(questionId, { status: 'pending' })
        return res.status(200).json({
          success: false,
          error: `AI 识别失败: ${identifyResult.error}`,
          questionId,
        })
      }

      questionTypeName = identifyResult.content.trim()
      const matchedType = allTypes.find((t) => t.name === questionTypeName)

      if (!matchedType) {
        // 没有匹配到题型 → 保存题目为 pending，返回友好提示
        await fetchUserQuestionPatch(questionId, { status: 'pending' })
        return res.status(200).json({
          success: false,
          error: '没有匹配到合适的题型，请联系客服',
          questionId,
        })
      }

      questionTypeId = matchedType.id

      // 结构化分析（使用 matchedType 的 analysis_prompt，8s 超时）
      if (matchedType?.analysis_prompt) {
        const analysisResult = await callAI({
          systemPrompt: matchedType.analysis_prompt,
          prompt: `请分析以下数学题：\n\n${question.question_text}`,
          responseFormat: 'json_object',
          temperature: 0.5,
          maxTokens: 2048,
          timeoutSeconds: 8,
        })
        if (!analysisResult.success) throw new Error(`AI 分析失败: ${analysisResult.error}`)

        try {
          analysisJson = JSON.parse(analysisResult.content)
        } catch {
          analysisJson = { raw: analysisResult.content }
        }
      }

      // 保存到 user_questions
      await fetch(`${SUPABASE_URL}/rest/v1/user_questions?id=eq.${questionId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          question_type_id: questionTypeId,
          question_type: questionTypeName,
          analysis_json: analysisJson,
          status: 'completed',
        }),
      })
    }

    // ============================================================
    // Step 4: 获取 html_prompt + 生成 HTML
    // ============================================================
    let htmlPrompt = ''
    if (questionTypeId) {
      const promptRes = await fetch(
        `${SUPABASE_URL}/rest/v1/question_types?id=eq.${questionTypeId}`,
        { headers: { ...headers, Prefer: undefined } }
      )
      if (promptRes.ok) {
        const pt = await promptRes.json()
        htmlPrompt = pt?.[0]?.html_prompt || ''
      }
    }

    const htmlGenResult = await callAI({
      systemPrompt: htmlPrompt || '你是一名小学数学老师，请生成一个漂亮的互动教学 HTML 演示页面。',
      prompt: `根据以下题目分析结果，生成互动 HTML 演示：\n\n题目原文：${question.question_text}\n\n分析结果：${JSON.stringify(analysisJson, null, 2)}`,
      temperature: 0.6,
      maxTokens: 4096,
      timeoutSeconds: 8,
    })
    if (!htmlGenResult.success) {
      // HTML 生成失败 → 保存题目状态，让用户去互动列表重试
      await fetchUserQuestionPatch(questionId, { status: 'pending' })
      return res.status(200).json({
        success: false,
        error: '题目已保存，AI 生成暂时不可用，请到「我的互动列表」中重新生成',
        questionId,
      })
    }

    const htmlContent = htmlGenResult.content
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent)

    // ============================================================
    // Step 5: 存入 question_demos
    // ============================================================
    const demoRes = await fetch(`${SUPABASE_URL}/rest/v1/question_demos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question_id: questionId,
        html_url: dataUrl,
        title: `演示 ${Date.now().toString().slice(-4)}`,
      }),
    })
    if (!demoRes.ok) throw new Error('保存演示失败')
    const demos = await demoRes.json()
    const demo = demos?.[0] || {}

    // ============================================================
    // 返回结果
    // ============================================================
    return res.status(200).json({
      success: true,
      demoId: demo.id,
      htmlUrl: dataUrl,
    })
  } catch (e) {
    console.error('[generate/demo] error:', e.message)
    // 兜底：尝试保存题目为 pending，允许用户重试
    if (questionId) {
      await fetchUserQuestionPatch(questionId, { status: 'pending' }).catch(() => {})
    }
    return res.status(200).json({
      success: false,
      error: '题目已保存，生成过程出错了，请到「我的互动列表」中重新生成',
      questionId,
    })
  }
}
