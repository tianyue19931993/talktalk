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

  // ─── 辅助函数 ──────────────────────────────────────────

  /** 清理 AI 输出的纯 HTML：去掉开头结尾的非 HTML 文字 */
  function cleanHtmlContent(raw) {
    if (!raw) return ''
    const startIdx = raw.search(/<!DOCTYPE\s+html|<html[^>]*>/i)
    if (startIdx === -1) {
      const firstTag = raw.indexOf('<')
      if (firstTag === -1) return raw
      return raw.slice(firstTag).trim()
    }
    let out = raw.slice(startIdx).trim()
    const endIdx = out.search(/<\/html>\s*/i)
    if (endIdx !== -1) {
      out = out.slice(0, endIdx + '</html>'.length)
    }
    return out.trim()
  }

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
    let htmlPrompt = ''  // 将在下方填充

    // ════════════════════════════════════════════════════════
    // Step 2-3: 首次生成 → AI 识别题型 + 结构化分析
    // ════════════════════════════════════════════════════════
    if (!regenerate || !questionTypeId) {
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
        prompt: `题目：${question.question_text}\n\n可用题型：${typeNames}\n\n请判断这道题属于以上哪种题型，只返回题型名称，不要多余文字。`,
        temperature: 0.3,
        maxTokens: 50,
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
          htmlPrompt = fallbackPrompt
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
        } else {
          // 没有兜底配置 → 保存为 pending
          await patchQuestion(questionId, { status: 'pending' })
          return res.status(200).json({
            success: false,
            error: '没有匹配到合适的题型，请尝试调整题目描述后重试',
            questionId,
          })
        }

        // 跳过 analysis_prompt 阶段，直接用 htmlPrompt 继续到 Step 4
        // 设置标记让后续逻辑知道没有 questionTypeId
        questionTypeId = null
      }

      questionTypeId = matchedType.id
      htmlPrompt = matchedType.html_prompt || ''  // 已有 html_prompt，无需再查

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

    // ════════════════════════════════════════════════════════
    // Step 4: 用 analysis_json 驱动 HTML 生成
    // ════════════════════════════════════════════════════════
    // 首次生成：htmlPrompt 已在 Step 2-3 从 matchedType 取得
    // 重新生成：需从 question_types 表查询 html_prompt
    if (!htmlPrompt && questionTypeId) {
      const promptRes = await fetch(
        `${SUPABASE_URL}/rest/v1/question_types?id=eq.${questionTypeId}`,
        { headers: { ...headers, Prefer: undefined } }
      )
      if (promptRes.ok) {
        const pt = await promptRes.json()
        htmlPrompt = pt?.[0]?.html_prompt || ''
      }
    }

    // 把 analysis_json 转为结构化的数据指引
    const hasSteps = !!(analysisJson.thinking_steps && analysisJson.thinking_steps.length > 0)
    const knowledgeStr = analysisJson.knowledge
      ? (Array.isArray(analysisJson.knowledge) ? analysisJson.knowledge.join('、') : String(analysisJson.knowledge))
      : ''
    const stepsStr = hasSteps
      ? analysisJson.thinking_steps.map((s, i) => {
          const inputInfo = s.input_type === 'choice'
            ? `【选择题】选项：${(s.options || []).join(' / ')}`
            : `【填空题】输入数字答案`
          return `步骤 ${i + 1}：「${s.title || ''}」
  - 引导提问：${s.teacher_question || ''}
  - 交互方式：${inputInfo}
  - 正确答：${s.correct_answer != null ? s.correct_answer : ''}
  - 提示信息：${s.hint || ''}
  - 阶段结论：${s.conclusion || ''}`
        }).join('\n\n')
      : '（无步骤数据）'

    const answerStr = analysisJson.answer
      ? JSON.stringify(analysisJson.answer, null, 2)
      : '（无）'

    const systemPrompt = (htmlPrompt || '').trim()
      ? htmlPrompt
      : `你是一名小学数学互动 HTML 生成专家。

你必须严格按照以下规则输出：
1. 只输出纯 HTML 代码，不包含任何 markdown 标记、说明文字、代码块
2. HTML 必须完整、可独立运行（含所有 CSS + JavaScript）
3. 所有文字内容使用中文
4. 不要出现"这是为您准备的"等 AI 元描述文字`

    const userPrompt = `请根据以下数据结构生成一个互动的 HTML 教学页面。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 题目原文
${question.question_text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 知识点：${knowledgeStr || '（无）'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 步骤式交互数据（analysis_json.thinking_steps）

系统将按照以下步骤驱动交互流程，每步对应一个关卡卡片：

${stepsStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 最终答案：${answerStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【重要 — 数据结构与 UI 的精确映射规则】

你必须严格按以下规则将 thinking_steps 的每个字段映射到 UI：

1. teacher_question → 显示在当前步骤卡片顶部的「引导提问」区域，作为学生当前要回答的问题

2. input_type：
   - "choice" → 渲染为多个选项按钮，点击其中一项即为作答
   - "number" → 渲染为一个数字输入框 + 提交按钮

3. options[] → 当 input_type="choice" 时，每个选项渲染为一个可点击的按钮

4. correct_answer → 用于验证用户输入。输入后立即校验：
   - 答对 → 绿色 ✓ 反馈 + 显示本步 conclusion → 自动过渡到下一步
   - 答错 → 红色 ✗ 反馈 + 显示 hint → 用户可重新作答

5. hint → 答错时显示的提示文字，引导学生思考

6. conclusion → 答对后显示的阶段性结论，代表本步骤完成

7. 步骤切换：所有步骤按 thinking_steps 数组的顺序串行，每完成一步进入下一步

8. 全部完成后：显示 "🎉 所有步骤完成！" + 最终答案 answer

【UI 要求】
- 卡片式布局，每步一个卡片
- 当前步骤卡片高亮显示，已完成步骤显示 ✓
- 卡片颜色、圆角使用你见到的现代 UI 风格
- 适配移动端和 PC（响应式）`

    const htmlGenResult = await callAI({
      systemPrompt,
      prompt: userPrompt,
      temperature: 0.5,
      maxTokens: 8192,
      timeoutSeconds: 25,
    })

    if (!htmlGenResult.success) {
      await patchQuestion(questionId, { status: 'pending' })
      return res.status(200).json({
        success: false,
        error: 'HTML 生成超时或失败，题目已保存，请到「我的互动列表」中重新生成',
        questionId,
      })
    }

    // 清理 HTML
    const htmlContent = cleanHtmlContent(htmlGenResult.content)
    // 基本校验：至少包含 <html 或 <!DOCTYPE
    if (!htmlContent || (!htmlContent.includes('<html') && !htmlContent.includes('<!DOCTYPE'))) {
      await patchQuestion(questionId, { status: 'pending' })
      return res.status(200).json({
        success: false,
        error: '生成的 HTML 格式不完整，请到「我的互动列表」中重新生成',
        questionId,
      })
    }

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
