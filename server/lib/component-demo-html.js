function serializeJson(value) {
  return JSON.stringify(value ?? null)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function getRequestOrigin(req) {
  const forwardedProto = String(req.headers?.['x-forwarded-proto'] || '').split(',')[0].trim()
  const protocol = forwardedProto || (String(req.headers?.host || '').includes('localhost') ? 'http' : 'https')
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || 'localhost:5173').split(',')[0].trim()
  return `${protocol}://${host}`
}

export function buildComponentDemoHtml(question, origin, runtimeAssets = {}, options = {}) {
  const cleanOrigin = String(origin || '').replace(/\/$/, '')
  const isLocal = /localhost|127\.0\.0\.1/.test(cleanOrigin)
  const runtimeScript = isLocal
    ? `${cleanOrigin}/src/demo-standalone.tsx`
    : `${cleanOrigin}/demo-runtime/demo-standalone.js`
  const runtimeCss = isLocal ? '' : `${cleanOrigin}/demo-runtime/demo-standalone.css`
  const inlineScript = typeof runtimeAssets.script === 'string'
    ? runtimeAssets.script.replace(/<\/script/gi, '<\\/script')
    : ''
  const inlineCss = typeof runtimeAssets.css === 'string'
    ? runtimeAssets.css.replace(/<\/style/gi, '<\\/style')
    : ''
  const data = {
    question_text: question?.question_text || '',
    math_analysis_json: question?.math_analysis_json || {},
    logic_analysis_json: question?.logic_analysis_json || {},
    tutor_analysis_json: question?.tutor_analysis_json || {},
    component_analysis_json: question?.component_analysis_json || [],
    line_analysis_json: question?.line_analysis_json ?? null,
    discovery_mode: options.discoveryMode === 'empty' ? 'empty' : 'components',
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>互动演示</title>
  ${inlineCss ? `<style>${inlineCss}</style>` : runtimeCss ? `<link rel="stylesheet" href="${runtimeCss}" />` : ''}
  <style>
    html, body { margin: 0; min-height: 100%; background: #FAFAFA; }
    #demo-root { box-sizing: border-box; width: min(100%, 1080px); margin: 0 auto; padding: 24px 18px 40px; }
    @media (max-width: 640px) { #demo-root { padding: 14px 10px 28px; } }
  </style>
</head>
<body>
  <div id="demo-root">
    <div id="demo-loading" style="margin:40px auto;max-width:520px;border:1px solid #E2E8F0;border-radius:16px;background:#FFFFFF;padding:20px;color:#64748B;font:14px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;">正在加载互动演示...</div>
  </div>
  <script>
    (function () {
      function showRuntimeError(message) {
        var root = document.getElementById('demo-root');
        if (!root) return;
        root.innerHTML = '<div style="margin:40px auto;max-width:620px;border:1px solid #FCA5A5;border-radius:16px;background:#FEF2F2;padding:20px;color:#B91C1C;font:14px/1.7 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;"><strong>互动演示加载失败</strong><div style="margin-top:6px;word-break:break-all;">' + String(message || '未知错误').replace(/[&<>]/g, function (char) { return ({'&':'&amp;','<':'&lt;','>':'&gt;'})[char]; }) + '</div></div>';
      }
      window.addEventListener('error', function (event) { showRuntimeError(event.message); });
      window.addEventListener('unhandledrejection', function (event) { showRuntimeError(event.reason && event.reason.message ? event.reason.message : event.reason); });
    })();
  </script>
  <script>window.__DEMO_DATA__=${serializeJson(data)};</script>
  ${inlineScript ? `<script>${inlineScript}</script>` : `<script ${isLocal ? 'type="module" ' : ''}src="${runtimeScript}"></script>`}
</body>
</html>`
}
