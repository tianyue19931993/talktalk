/**
 * POST /api/generate/demo
 *
 * 用户点击"立即生成"或"重新生成"时调用的 API。
 * 完整的生成链路：分析题型 → 结构化分析 → 模板替换 → 存入数据库。
 *
 * 【第 6 步】不再用 AI 现场写 HTML，而是用 question_types.html_prompt 中
 * 存储的 HTML 模板（含 ${analysis_json} 占位符），直接做字符串替换。
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

  // ─── 辅助函数 ──────────────────────────────────────────

  /** 静默更新 user_questions 字段（best effort，不抛错） */
  async function patchQuestion(id, body) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/user_questions?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch { /* best effort */ }
  }

  // ─── 主流程 ──────────────────────────────────────────

  try {
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

    // ════════════════════════════════════════════════════════
    // Step 1: 加载用户题目
    // ════════════════════════════════════════════════════════
    const qRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_questions?id=eq.${questionId}`,
      { headers: { ...headers, Prefer: undefined } }
    )
    if (!qRes.ok) throw new Error(`加载题目失败: ${qRes.status}`)
    const qRows = await qRes.json()
    const question = qRows?.[0]
    if (!question) throw new Error('题目不存在')

    let questionTypeId = question.question_type_id
    let questionTypeName = question.question_type || ''
    let analysisJson = question.analysis_json || {}
    let htmlTemplate = ''  // 将从 question_types.html_prompt 加载

    // ════════════════════════════════════════════════════════
    // Step 2-3: AI 识别题型 + 结构化分析
    //
    // 重新生成（regenerate=true）：重新走完整流程
    // 已有题型数据（questionTypeId 非空）：跳过分析
    // ════════════════════════════════════════════════════════
    if (!questionTypeId || regenerate) {
      // 加载题型字典（一次获取所有字段：id, name, analysis_prompt, html_prompt）
      const typesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/question_types?order=id.asc`,
        { headers: { ...headers, Prefer: undefined } }
      )
      if (!typesRes.ok) throw new Error('加载题型失败')
      const allTypes = await typesRes.json()

      // ── Step 2: AI 识别题型 ──
      const typeNames = allTypes.map((t) => t.name).join('、')
      const identifyResult = await callAI({
        prompt: `判断下面这道题是否属于以下题型之一。\n\n可用题型：${typeNames}\n\n题目：${question.question_text}\n\n规则（严格遵循）：\n1. 如果这道题是数学题且属于以上某一种题型 → 只返回该题型名称\n2. 如果这道题不是数学题，或不属于以上任何题型 → 只返回「不匹配」\n\n只返回一个词，不要任何其他文字。`,
        temperature: 0,
        maxTokens: 20,
        timeoutSeconds: 5,
      })
      if (!identifyResult.success) {
        console.error('[generate/demo] AI 识别失败:', identifyResult.error)
        await patchQuestion(questionId, { status: 'pending' })
        return res.status(200).json({
          success: false,
          error: `AI 识别失败: ${identifyResult.error}`,
          questionId,
        })
      }

      questionTypeName = identifyResult.content.trim()
      const matchedType = allTypes.find((t) => t.name === questionTypeName)

      if (!matchedType) {
        // 没有匹配到题型 → 查询 configs 表 key='temp' 的值作为兜底
        let fallbackPrompt = ''
        try {
          const cfgRes = await fetch(
            `${SUPABASE_URL}/rest/v1/configs?key=eq.temp`,
            { headers: { ...headers, Prefer: undefined } }
          )
          if (cfgRes.ok) {
            const cfgs = await cfgRes.json()
            fallbackPrompt = cfgs?.[0]?.value || ''
          }
        } catch { /* best effort */ }

        if (fallbackPrompt) {
          // 用兜底 prompt 当作 analysis_prompt 来执行
          htmlTemplate = fallbackPrompt
          questionTypeName = 'temp'
          const analysisResult = await callAI({
            systemPrompt: fallbackPrompt,
            prompt: `请分析以下数学题：\n\n${question.question_text}`,
            responseFormat: 'json_object',
            temperature: 0.5,
            maxTokens: 2048,
            timeoutSeconds: 8,
          })
          if (analysisResult.success) {
            try {
              analysisJson = JSON.parse(analysisResult.content)
            } catch {
              analysisJson = { raw: analysisResult.content }
            }
          }
          // 不设 question_type_id，用 temp 标记
          await fetch(`${SUPABASE_URL}/rest/v1/user_questions?id=eq.${questionId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              question_type: '暂未分类',
              analysis_json: analysisJson,
            }),
          })
          // 跳过后面的 matchedType 逻辑，直接到 Step 4
          questionTypeId = null
        } else {
          await patchQuestion(questionId, { status: 'pending' })
          return res.status(200).json({
            success: false,
            error: '没有匹配到合适的题型，请尝试调整题目描述后重试',
            questionId,
          })
        }
      }

      // ── 正常 matchedType 路径 ──
      if (matchedType) {
        questionTypeId = matchedType.id
        htmlTemplate = matchedType.html_prompt || ''

        // ── Step 3: 结构化分析（使用 analysis_prompt）──
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

        // 保存题型 + 分析结果（不设 completed，等 HTML 生成后才设）
        await fetch(`${SUPABASE_URL}/rest/v1/user_questions?id=eq.${questionId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            question_type_id: questionTypeId,
            question_type: questionTypeName,
            analysis_json: analysisJson,
          }),
        })
      }
    }

    // ════════════════════════════════════════════════════════
    // Step 4: 模板替换 — 用 analysis_json 填充 HTML 模板
    //
    // 不再调用 AI 生成 HTML，而是在服务端做字符串替换。
    // 模板（html_prompt）由管理员在 PC 端上传，支持以下占位符：
    //   ${analysis_json}  — 整个 analysisJson 的 JSON 字符串
    //   ${question_text}  — 题目原文
    // ════════════════════════════════════════════════════════
    if (!htmlTemplate) {
      // 已有题型数据但没加载到模板的情况（重新生成路径）
      if (questionTypeId) {
        const templateRes = await fetch(
          `${SUPABASE_URL}/rest/v1/question_types?id=eq.${questionTypeId}`,
          { headers: { ...headers, Prefer: undefined } }
        )
        if (templateRes.ok) {
          const pt = await templateRes.json()
          htmlTemplate = pt?.[0]?.html_prompt || ''
        }
      }
    }

    // 没有模板 → 报错
    if (!htmlTemplate || !htmlTemplate.trim()) {
      await patchQuestion(questionId, { status: 'pending' })
      return res.status(200).json({
        success: false,
        error: '该题型暂无可用的 HTML 模板，请联系管理员上传',
        questionId,
      })
    }

    // 执行模板替换（用函数避免 String.replace 对 $ 的特殊解释）
    const analysisJsonStr = JSON.stringify(analysisJson, null, 2)
    let htmlContent = htmlTemplate
      .replace(/\$\{analysis_json\}/g, () => analysisJsonStr)
      .replace(/\$\{question_text\}/g, () => question.question_text)

    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent)

    // ════════════════════════════════════════════════════════
    // Step 5: 存入 question_demos + 标记 completed
    // ════════════════════════════════════════════════════════
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

    // 全部流程成功 → 标记为 completed
    await patchQuestion(questionId, { status: 'completed' })

    return res.status(200).json({
      success: true,
      demoId: demo.id,
      htmlUrl: dataUrl,
    })
  } catch (e) {
    console.error('[generate/demo] error:', e.message)
    if (questionId) {
      await patchQuestion(questionId, { status: 'pending' }).catch(() => {})
    }
    return res.status(200).json({
      success: false,
      error: '题目已保存，生成过程出错了，请到「我的互动列表」中重新生成',
      questionId,
    })
  }
}
