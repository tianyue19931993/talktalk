/**
 * POST /api/generate/demo
 *
 * 两种调用方式：
 *   新提交: { questionText: "3米等于多少厘米" }
 *   重新生成: { questionId: "xxx-xxx", regenerate: true }
 *
 * 完整链路：
 *   Step 0: 验证是否为数学题（仅新提交）→ 非数学题不落库
 *   Step 1: 保存题目到 user_questions（仅新提交）
 *   Step 2-3: AI 识别题型 + 结构化分析
 *   Step 4: 模板替换生成 HTML
 *   Step 5: 存入 question_demos + 标记 completed
 */

import { callAI } from '../lib/ai.js'

// 可用的实验组件类型（与前端 EXPERIMENT_COMPONENTS 一致）
const COMPONENT_TYPES = ['comparison', 'fraction', 'area']

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ─── JWT 载荷解码（轻量，无依赖） ─────────────────
function getUserIdFromToken(req) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    if (!token || token.split('.').length !== 3) return null
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
    )
    return payload.sub || null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase not configured' })
  }

  const { questionText, questionId, regenerate } = req.body
  const isNewSubmit = !!questionText && !questionId
  const isRegenerate = !!questionId && !!regenerate

  if (!isNewSubmit && !isRegenerate && !questionId) {
    return res.status(400).json({ success: false, error: 'questionText 或 questionId 是必需的' })
  }

  // ─── Supabase 服务端请求头（带 service_role 权限） ───
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    Prefer: 'return=representation',
  }

  // ─── 辅助：完整 PATCH（非 best effort，会抛错） ───
  async function patchQuestionFull(id, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/user_questions?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`PATCH user_questions 失败: ${r.status}`)
  }

  let actualQuestionId = questionId
  let questionTextStr = questionText || ''

  // ============================================================
  // try 主流程
  // ============================================================
  try {
    // ════════════════════════════════════════════════════════════
    // Step 0: 验证是否为数学题（仅新提交）
    // ════════════════════════════════════════════════════════════
    if (isNewSubmit) {
      const mathCheck = await callAI({
        prompt: `请判断以下内容是否为一道数学题，只回答「是」或「否」，不要任何其他文字。\n\n内容：${questionText}`,
        temperature: 0,
        maxTokens: 10,
        timeoutSeconds: 5,
      })

      if (!mathCheck.success) {
        return res.status(200).json({
          success: false,
          error: `AI 验证失败: ${mathCheck.error}`,
          notMath: false,
        })
      }

      if (mathCheck.content.trim() !== '是') {
        return res.status(200).json({
          success: false,
          error: '请输入正确的数学题',
          notMath: true,
        })
      }

      // ── 是数学题 → 保存到 user_questions ──
      const userId = getUserIdFromToken(req)
      if (!userId) {
        return res.status(401).json({ success: false, error: '未登录' })
      }

      questionTextStr = questionText
      const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/user_questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question_text: questionText, user_id: userId }),
      })
      if (!saveRes.ok) throw new Error(`保存题目失败: ${saveRes.status}`)
      const savedRows = await saveRes.json()
      actualQuestionId = savedRows?.[0]?.id
      if (!actualQuestionId) throw new Error('保存题目失败：未返回 ID')
    }

    // ════════════════════════════════════════════════════════════
    // Step 1: 加载用户题目（重新生成流程从此进入）
    // ════════════════════════════════════════════════════════════
    const qRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_questions?id=eq.${actualQuestionId}`,
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

    // ════════════════════════════════════════════════════════════
    // Step 2-3: AI 识别题型 + 结构化分析
    //
    // 重新生成（regenerate=true）：重新走完整流程
    // 已有题型数据（questionTypeId 非空）：跳过分析
    // ════════════════════════════════════════════════════════════
    if (!questionTypeId || regenerate) {
      // 加载题型字典
      const typesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/question_types?order=id.asc`,
        { headers: { ...headers, Prefer: undefined } }
      )
      if (!typesRes.ok) throw new Error('加载题型失败')
      const allTypes = await typesRes.json()

      // ── Step 2: AI 识别题型 ──
      const typeNames = allTypes.map((t) => t.name).join('、')
      const identifyResult = await callAI({
        prompt: `判断下面这道题属于以下哪个题型。\n\n可用题型：${typeNames}\n\n题目：${question.question_text}\n\n规则（严格遵循）：\n1. 如果属于以上某一种题型 → 只返回该题型名称\n2. 如果不属于以上任何题型 → 只返回「不匹配」\n\n只返回一个词，不要任何其他文字。`,
        temperature: 0,
        maxTokens: 20,
        timeoutSeconds: 5,
      })
      if (!identifyResult.success) {
        await patchQuestionFull(actualQuestionId, { status: 'pending' })
        return res.status(200).json({
          success: false,
          error: `AI 识别失败: ${identifyResult.error}`,
          questionId: actualQuestionId,
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
          // temp 是一个综合 prompt → AI 直接生成完整 HTML
          const htmlResult = await callAI({
            systemPrompt: fallbackPrompt,
            prompt: `题目原文：\n\n${question.question_text}`,
            temperature: 0.6,
            maxTokens: 8192,
            timeoutSeconds: 25,
          })
          if (!htmlResult.success || !htmlResult.content) {
            await patchQuestionFull(actualQuestionId, { status: 'pending' })
            return res.status(200).json({
              success: false,
              error: 'AI 生成暂时不可用，请到「我的互动列表」中重新生成',
              questionId: actualQuestionId,
            })
          }
          // 清理 HTML：只保留 DOCTYPE~html 之间的内容
          const startIdx = htmlResult.content.search(/<!DOCTYPE\s+html|<html[^>]*>/i)
          const fallbackHtmlRaw = startIdx === -1 ? htmlResult.content.trim() : htmlResult.content.slice(startIdx).trim()
          const htmlEnd = fallbackHtmlRaw.search(/<\/html>\s*/i)
          const fallbackHtml = htmlEnd !== -1 ? fallbackHtmlRaw.slice(0, htmlEnd + '<\/html>'.length) : fallbackHtmlRaw
          const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(fallbackHtml)

          // 标记为 completed（走 temp 不经过 analysis_json 流程）
          await patchQuestionFull(actualQuestionId, {
            question_type: '暂未分类',
            status: 'completed',
          })
          // 存入 question_demos
          const demoRes = await fetch(`${SUPABASE_URL}/rest/v1/question_demos`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              question_id: actualQuestionId,
              html_url: dataUrl,
              title: `演示 ${Date.now().toString().slice(-4)}`,
            }),
          })
          if (!demoRes.ok) throw new Error('保存演示失败')
          const demos = await demoRes.json()
          const demo = demos?.[0] || {}
          return res.status(200).json({
            success: true,
            demoId: demo.id,
            htmlUrl: dataUrl,
            questionId: actualQuestionId,
          })
        } else {
          await patchQuestionFull(actualQuestionId, { status: 'pending' })
          return res.status(200).json({
            success: false,
            error: '没有匹配到合适的题型，请尝试调整题目描述后重试',
            questionId: actualQuestionId,
          })
        }
      }

      // ── 正常 matchedType 路径 ──
      if (matchedType) {
        questionTypeId = matchedType.id
        htmlTemplate = matchedType.html_prompt || ''

        // ── Step 3: 结构化分析（使用 analysis_prompt）──
        if (matchedType.analysis_prompt) {
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
        await fetch(`${SUPABASE_URL}/rest/v1/user_questions?id=eq.${actualQuestionId}`, {
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

    // ════════════════════════════════════════════════════════════
    // Step 4: 模板替换 — 用 analysis_json 填充 HTML 模板
    // ════════════════════════════════════════════════════════════
    if (!htmlTemplate) {
      // 已有题型数据但没加载到模板（重新生成路径）
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

    // 没有题型模板 → 使用内置通用模板（自适应多种 JSON 结构）
    if (!htmlTemplate || !htmlTemplate.trim()) {
      const d = JSON.stringify(analysisJson, null, 2)
      htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>互动学习</title>
<style>
:root{--pink:#FF0080;--purple:#7928CA;--blue:#0070F3;--bg:#FAFAFA;--card:#FFF;--ink:#171717;--body:#4D4D4D;--mute:#888}
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,system-ui,sans-serif}
body{background:var(--bg);color:var(--body);padding:16px;display:flex;justify-content:center;min-height:100vh}
.container{width:100%;max-width:680px;display:flex;flex-direction:column;gap:16px;padding-bottom:40px}
.card{background:var(--card);border-radius:24px;box-shadow:0 1px 3px rgba(0,0,0,.04),0 2px 8px rgba(0,0,0,.04);padding:24px;margin-bottom:16px}
.q-text{font-size:15px;color:var(--ink);line-height:1.6;font-weight:500}
h2{font-size:13px;color:var(--mute);margin-bottom:12px}
.section-label{font-size:11px;font-weight:600;color:var(--mute);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.stat-box{padding:16px;background:var(--bg);border-radius:16px;text-align:center}
.stat-value{font-size:20px;font-weight:700;color:var(--purple);margin-bottom:4px}
.stat-label{font-size:11px;color:var(--mute)}
.step{padding:16px;background:var(--bg);border-radius:12px;margin-bottom:12px;border-left:4px solid var(--purple)}
.step-num{font-size:11px;color:var(--mute);margin-bottom:4px}
.step-q{font-size:14px;color:var(--ink);font-weight:600;margin-bottom:8px}
.step-ans{font-size:13px;color:var(--blue);padding:8px 12px;background:rgba(0,112,243,.08);border-radius:8px;margin-bottom:6px}
.step-hint{font-size:12px;color:var(--mute);padding:8px 12px;background:var(--bg);border-radius:8px;border:1px dashed #ddd}
.step-concl{font-size:13px;color:#16a34a;padding:8px 12px;background:rgba(22,163,74,.08);border-radius:8px;margin-top:6px}
.answer-box{margin-top:16px;padding:16px;background:linear-gradient(135deg,var(--purple),var(--pink));border-radius:16px;color:#fff;text-align:center}
.obj-tag{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;background:var(--bg);border-radius:24px;font-size:13px;margin:0 4px 8px 0}
.ctrl-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:24px;font-size:13px;font-weight:500;border:1px solid #ddd;background:var(--card);color:var(--ink);margin:0 4px 8px 0}
.disc-card{padding:12px 16px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-size:13px;margin-bottom:8px;border-left:4px solid #16a34a}
.obs-card{padding:12px 16px;background:var(--bg);border-radius:12px;font-size:12px;color:var(--body);margin-bottom:8px;border-left:4px solid var(--blue)}
.raw-json{font-size:11px;font-family:monospace;background:var(--bg);padding:16px;border-radius:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;color:var(--body);line-height:1.5}
.equation{text-align:center;padding:16px;background:linear-gradient(135deg,rgba(121,40,202,.06),rgba(0,112,243,.06));border-radius:16px;font-size:16px;font-weight:600;color:var(--purple);margin:8px 0}
</style>
</head>
<body>
<div class="container" id="app-root">
<div class="card"><h2>📝 题目</h2><p class="q-text">\${question_text}</p></div>
<div id="dynamic-content"><p style="font-size:13px;color:var(--mute);text-align:center;padding:20px">加载中...</p></div>
</div>
<script>
var data = ${d};
(function(){try{var el=document.getElementById('dynamic-content');if(!el)return;if(!data){el.innerHTML='<div class="card"><p style="font-size:13px;color:var(--mute);text-align:center">暂无分析数据</p></div>';return;}

// ---------- 场景式（scene + objects + controls）----------
if(data.scene&&data.objects){var s=data.scene,o=data.objects,c=data.controls,k=data.known_data,di=data.discoveries,ob=data.observations,h=data.hidden_data;var h2='<div class="card">';
h2+='<div class="section-label">🧪 实验场景</div>';
h2+='<p style="font-size:14px;color:var(--body);line-height:1.6;margin-bottom:16px">'+esc(s.description)+'</p>';
if(o&&o.length){h2+='<div style="margin-bottom:12px">';o.forEach(function(x){h2+='<span class="obj-tag">'+esc(x.icon||'')+' '+esc(x.name||'')+'</span>'});h2+='</div>'}
if(c&&c.length){h2+='<div class="section-label" style="margin-top:12px">🎮 操作</div><div>';c.forEach(function(x){h2+='<span class="ctrl-btn">'+esc(x.action)+'</span>'});h2+='</div>'}
h2+='</div>';

// 已知数据
if(k&&k.length){h2+='<div class="card"><div class="section-label">📊 已知数据</div><div class="grid-2">';k.forEach(function(x){h2+='<div class="stat-box"><div class="stat-value">'+esc(x.total_value)+'<span style="font-size:13px;font-weight:400;color:var(--mute);margin-left:4px">'+esc(x.unit||'')+'</span></div><div class="stat-label">'+esc(x.label||'')+'</div></div>'});h2+='</div></div>'}

// 思考发现
if(di&&di.length){h2+='<div class="card"><div class="section-label">💡 思考发现</div>';di.forEach(function(x){h2+='<div class="disc-card">✨ '+esc(x.rule||'')+'</div>'});h2+='</div>'}

// 观察
if(ob&&ob.length){h2+='<div class="card"><div class="section-label">🔍 观察</div>';ob.forEach(function(x){h2+='<div class="obs-card">👁️ '+esc(x.phenomenon||'')+'</div>'});h2+='</div>'}

// 隐藏答案区域
if(h&&h.length){h2+='<div class="card" id="answer-section"><div class="section-label">🎯 隐藏发现</div>';h.forEach(function(x){h2+='<div class="stat-box" style="margin-bottom:8px"><div class="stat-label" style="font-size:13px">'+esc(x.label||'')+'</div><div class="stat-value" style="color:var(--mute);font-size:16px">点击按钮显示答案</div></div>'});h2+='<div style="text-align:center;margin-top:12px"><button onclick="document.querySelectorAll(\'#answer-section .stat-value\').forEach(function(e,i){e.textContent=answers[i]||\'?\';e.style.color=\'var(--purple)\'})" style="padding:8px 20px;border:none;border-radius:24px;background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff;font-size:13px;font-weight:500;cursor:pointer">🎯 显示答案</button></div></div>'}

el.innerHTML=h2;return}

// ---------- thinking_steps 格式（兼容旧版）----------
if(data.thinking_steps&&data.thinking_steps.length){var h3='<div class="card" id="steps-container"><div class="section-label">🔍 思维引导</div>';data.thinking_steps.forEach(function(s,i){h3+='<div class="step"><div class="step-num">步骤 '+(i+1)+'</div><div class="step-q">'+esc(s.teacher_question||s.title||'')+'</div><div class="step-ans">✅ 答案：'+(s.correct_answer!=null?s.correct_answer:'')+'</div>';if(s.hint)h3+='<div class="step-hint">💡 提示：'+esc(s.hint)+'</div>';if(s.conclusion)h3+='<div class="step-concl">📌 '+esc(s.conclusion)+'</div>';h3+='</div>'});if(data.answer)h3+='<div class="answer-box">🎉 最终答案：'+JSON.stringify(data.answer)+'</div>';h3+='</div>';el.innerHTML=h3;return}

// ---------- 通用数据视图（known_data 等）----------
if(data.known_data){var h4='<div class="card"><div class="section-label">📊 分析数据</div>';if(Array.isArray(data.known_data)){data.known_data.forEach(function(x){h4+='<div class="stat-box" style="margin-bottom:8px"><div class="stat-value">'+esc(x.total_value||x.value||'')+'</div><div class="stat-label">'+esc(x.label||'')+'</div></div>'})}else{h4+='<pre class="raw-json">'+esc(JSON.stringify(data.known_data,null,2))+'</pre>'}h4+='</div>';el.innerHTML=h4;return}

// ---------- 兜底：格式化 JSON ----------
el.innerHTML='<div class="card"><div class="section-label">📊 分析结果</div><pre class="raw-json">'+esc(JSON.stringify(data,null,2))+'</pre></div>';}catch(e){var errEl=document.getElementById('dynamic-content');if(errEl)errEl.innerHTML='<div class="card"><p style="font-size:13px;color:var(--mute);text-align:center">无法加载分析内容</p></div>'}})()
function esc(s){if(typeof s!=='string')return String(s||'');return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
var answers=[];
try{var r=data;if(r.hidden_data)answers=r.hidden_data.map(function(x){return x.label||'?'});if(r.discoveries&&answers.length===0)answers=r.discoveries.map(function(x,i){return r.known_data&&r.known_data.length>i?'\u89e3\u51b3\u65b9\u6848 '+(i+1):''})}catch(e){}
<\/script>
</body>
</html>`
    }

    // ── 判断是否为实验组件类型（非 HTML 模板） ──
    const trimmedTemplate = (htmlTemplate || '').trim().toLowerCase()
    const isComponentType = COMPONENT_TYPES.includes(trimmedTemplate)

    if (isComponentType) {
      // 组件类型 → 不生成 HTML，存 __experiment__ 标记，由前端 ExperimentPage 渲染
      const demoRes = await fetch(`${SUPABASE_URL}/rest/v1/question_demos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question_id: actualQuestionId,
          html_url: '__experiment__',
          title: `演示 ${Date.now().toString().slice(-4)}`,
        }),
      })
      if (!demoRes.ok) throw new Error('保存演示失败')
      const demos = await demoRes.json()
      const demo = demos?.[0] || {}

      // 标记为 completed
      await patchQuestionFull(actualQuestionId, { status: 'completed' })

      return res.status(200).json({
        success: true,
        demoId: demo.id,
        htmlUrl: '__experiment__',
        questionId: actualQuestionId,
      })
    }

    // ── HTML 模板类型 → 执行模板替换 ──
    const analysisJsonStr = JSON.stringify(analysisJson, null, 2)
    const htmlContent = htmlTemplate
      .replace(/\$\{analysis_json\}/g, () => analysisJsonStr)
      .replace(/\$\{question_text\}/g, () => question.question_text)

    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent)

    // ════════════════════════════════════════════════════════════
    // Step 5: 存入 question_demos + 标记 completed
    // ════════════════════════════════════════════════════════════
    const demoRes = await fetch(`${SUPABASE_URL}/rest/v1/question_demos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question_id: actualQuestionId,
        html_url: dataUrl,
        title: `演示 ${Date.now().toString().slice(-4)}`,
      }),
    })
    if (!demoRes.ok) throw new Error('保存演示失败')
    const demos = await demoRes.json()
    const demo = demos?.[0] || {}

    // 全部流程成功 → 标记为 completed（使用完整 headers，非 best effort）
    await patchQuestionFull(actualQuestionId, { status: 'completed' })

    return res.status(200).json({
      success: true,
      demoId: demo.id,
      htmlUrl: dataUrl,
      questionId: actualQuestionId,
    })

  } catch (e) {
    console.error('[generate/demo] error:', e.message, e.stack)
    if (actualQuestionId) {
      try {
        await patchQuestionFull(actualQuestionId, { status: 'pending' })
      } catch { /* 静默处理 */ }
    }
    return res.status(200).json({
      success: false,
      error: '题目已保存，生成过程出错了，请到「我的互动列表」中重新生成',
      questionId: actualQuestionId,
    })
  }
}
