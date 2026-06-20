/**
 * 七牛 Kodo 对象存储上传工具
 *
 * 环境变量：
 *   QINIU_ACCESS_KEY  - AccessKey（从七牛个人中心获取）
 *   QINIU_SECRET_KEY  - SecretKey（从七牛个人中心获取）
 *   QINIU_BUCKET      - 空间名称，默认 chengzhangbiaoda-lab
 *   QINIU_DOMAIN      - CDN 域名（必填，如 https://cdn.example.com）
 *   QINIU_UPLOAD_HOST - 上传域名，默认 https://up.qiniup.com（华东）
 */

import crypto from 'crypto'

const ACCESS_KEY = process.env.QINIU_ACCESS_KEY || ''
const SECRET_KEY = process.env.QINIU_SECRET_KEY || ''
const BUCKET = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab'
const DOMAIN = process.env.QINIU_DOMAIN || ''
const UPLOAD_HOST = process.env.QINIU_UPLOAD_HOST || 'https://up.qiniup.com'

/** URL Safe Base64 */
function urlsafeBase64(str) {
  if (Buffer.isBuffer(str)) {
    return str
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** 生成上传凭证 */
function generateUploadToken(key) {
  const putPolicy = JSON.stringify({
    scope: `${BUCKET}:${key}`,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  })
  const encodedPutPolicy = urlsafeBase64(putPolicy)
  const sign = crypto.createHmac('sha1', SECRET_KEY).update(encodedPutPolicy).digest()
  const encodedSign = urlsafeBase64(sign)
  return `${ACCESS_KEY}:${encodedSign}:${encodedPutPolicy}`
}

/**
 * 上传 HTML 内容到 Kodo
 * @param {string} content - HTML 源码
 * @param {string} key - Kodo 对象 key（如 MHTML/user/xxx/xxx.html）
 * @returns {Promise<string>} 可公开访问的 URL
 */
export async function uploadHtml(content, key) {
  if (!ACCESS_KEY || !SECRET_KEY) {
    throw new Error('QINIU_ACCESS_KEY / QINIU_SECRET_KEY 未配置')
  }
  if (!DOMAIN) {
    throw new Error('QINIU_DOMAIN 未配置')
  }

  const token = generateUploadToken(key)
  const encodedEntryURI = urlsafeBase64(`${BUCKET}:${key}`)
  const url = `${UPLOAD_HOST}/put-auth/${encodedEntryURI}`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `UpToken ${token}`,
      'Content-Type': 'text/html; charset=utf-8',
    },
    body: content,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('[qiniu] upload response:', res.status, errText.slice(0, 500))
    throw new Error(`Kodo upload failed (${res.status}): ${errText.slice(0, 200)}`)
  }

  return `${DOMAIN}/${key}`
}

/** 检查配置是否就绪 */
export function isQiniuConfigured() {
  return !!(ACCESS_KEY && SECRET_KEY && DOMAIN)
}
