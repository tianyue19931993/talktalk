/**
 * 七牛 Kodo 对象存储上传工具（使用官方 SDK）
 *
 * 环境变量：
 *   QINIU_ACCESS_KEY  - AccessKey
 *   QINIU_SECRET_KEY  - SecretKey
 *   QINIU_BUCKET      - 空间名称，默认 chengzhangbiaoda-lab
 *   QINIU_DOMAIN      - CDN 域名（必填）
 *   QINIU_REGION      - 区域，默认 z0（华东），可选 z1/z2/na0/as0
 */

import qiniu from 'qiniu'

const ACCESS_KEY = process.env.QINIU_ACCESS_KEY || ''
const SECRET_KEY = process.env.QINIU_SECRET_KEY || ''
const BUCKET = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab'
const DOMAIN = process.env.QINIU_DOMAIN || ''
const REGION = process.env.QINIU_REGION || 'z0'

const mac = new qiniu.auth.digest.Mac(ACCESS_KEY, SECRET_KEY)

/** 区域映射 */
function getZone() {
  const map = {
    z0: qiniu.zone.Zone_z0,
    z1: qiniu.zone.Zone_z1,
    z2: qiniu.zone.Zone_z2,
    na0: qiniu.zone.Zone_na0,
    as0: qiniu.zone.Zone_as0,
  }
  return map[REGION] || qiniu.zone.Zone_z0
}

/**
 * 上传 HTML 内容到 Kodo
 * @param {string} content - HTML 源码
 * @param {string} key - 对象 key（如 MHTML/user/xxx/xxx.html）
 * @returns {Promise<string>} 可公开访问的 URL
 */
export async function uploadHtml(content, key) {
  if (!ACCESS_KEY || !SECRET_KEY) {
    throw new Error('QINIU_ACCESS_KEY / QINIU_SECRET_KEY 未配置')
  }
  if (!DOMAIN) {
    throw new Error('QINIU_DOMAIN 未配置')
  }

  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${BUCKET}:${key}`,
  })
  const uploadToken = putPolicy.uploadToken(mac)

  const config = new qiniu.conf.Config()
  config.zone = getZone()

  const formUploader = new qiniu.form_up.FormUploader(config)
  const putExtra = new qiniu.form_up.PutExtra()

  return new Promise((resolve, reject) => {
    formUploader.put(
      uploadToken,
      key,
      Buffer.from(content, 'utf-8'),
      putExtra,
      (err, body, info) => {
        if (err) {
          console.error('[qiniu] upload error:', err)
          return reject(new Error(`Kodo 上传失败: ${err.message || err}`))
        }
        if (info.statusCode !== 200) {
          const msg = body?.error || JSON.stringify(info)
          console.error('[qiniu] upload failed:', info.statusCode, msg)
          return reject(new Error(`Kodo 上传失败 (${info.statusCode}): ${msg}`))
        }
        resolve(`${DOMAIN}/${key}`)
      }
    )
  })
}

/** 检查配置是否就绪 */
export function isQiniuConfigured() {
  return !!(ACCESS_KEY && SECRET_KEY && DOMAIN)
}
