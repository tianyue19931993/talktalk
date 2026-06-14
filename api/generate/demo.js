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
          // 用兜底 prompt 当作 analysis_prompt 来执行（不设 htmlTemplate，走内置通用模板）
          questionTypeName = '暂未分类'
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

    // 没有题型模板 → 使用内置通用模板（暂未分类题型走这里）
    if (!htmlTemplate || !htmlTemplate.trim()) {
      var q = question.question_text.replace(/'/g, "\\'")
      var d = JSON.stringify(analysisJson, null, 2).replace(/'/g, "\\'")
      htmlTemplate = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>互动学习</title><style>:root{--pink:#FF0080;--purple:#7928CA;--blue:#0070F3;--bg:#FAFAFA;--card:#FFF;--ink:#171717;--body:#4D4D4D;--mute:#888}*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,system-ui,sans-serif}body{background:var(--bg);color:var(--body);padding:16px;display:flex;justify-content:center;min-height:100vh}.container{width:100%;max-width:680px;display:flex;flex-direction:column;gap:16px;padding-bottom:40px}.card{background:var(--card);border-radius:24px;box-shadow:0 1px 3px rgba(0,0,0,.04),0 2px 8px rgba(0,0,0,.04);padding:24px}.q-text{font-size:15px;color:var(--ink);line-height:1.6;font-weight:500}.step{padding:16px;background:var(--bg);border-radius:12px;margin-bottom:12px;border-left:4px solid var(--purple)}.step-num{font-size:11px;color:var(--mute);margin-bottom:4px}.step-q{font-size:14px;color:var(--ink);font-weight:600;margin-bottom:8px}.step-ans{font-size:13px;color:var(--blue);padding:8px 12px;background:rgba(0,112,243,.08);border-radius:8px;margin-bottom:6px}.step-hint{font-size:12px;color:var(--mute);padding:8px 12px;background:var(--bg);border-radius:8px;border:1px dashed #ddd}.step-concl{font-size:13px;color:#16a34a;padding:8px 12px;background:rgba(22,163,74,.08);border-radius:8px;margin-top:6px}.answer-box{margin-top:16px;padding:16px;background:linear-gradient(135deg,var(--purple),var(--pink));border-radius:16px;color:#fff;text-align:center}h2{font-size:13px;color:var(--mute);margin-bottom:12px}</style></head><body><div class="container"><div class="card"><h2>📝 题目</h2><p class="q-text">' + q + '</p></div><div class="card" id="steps-container"><h2>🔍 思维引导</h2><p style="font-size:13px;color:var(--mute)">加载中...</p></div></div><script>try{var data=' + d + ';var c=document.getElementById("steps-container");if(!data||!data.thinking_steps||!data.thinking_steps.length){c.innerHTML="<h2>🔍 思维引导</h2><p style=\'font-size:13px;color:var(--mute)\'>暂无分析数据</p>";}else{var h="<h2>🔍 思维引导</h2>";data.thinking_steps.forEach(function(s,i){h+="<div class=\'step\'><div class=\'step-num\'>步骤"+(i+1)+"</div><div class=\'step-q\'>"+(s.teacher_question||s.title||"")+"</div><div class=\'step-ans\'>✅ 答案："+(s.correct_answer!=null?s.correct_answer:"")+"</div>";if(s.hint)h+="<div class=\'step-hint\'>💡 提示："+s.hint+"</div>";if(s.conclusion)h+="<div class=\'step-concl\'>📌 "+s.conclusion+"</div>";h+="</div>";});if(data.answer)h+="<div class=\'answer-box\'>🎉 最终答案："+JSON.stringify(data.answer)+"</div>";c.innerHTML=h;}}catch(e){document.getElementById("steps-container").innerHTML="<h2>🔍 思维引导</h2><p style=\'font-size:13px;color:var(--mute)\'>未能加载分析数据</p>";}<\/script></body></html>'
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
