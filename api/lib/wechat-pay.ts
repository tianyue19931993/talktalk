/**
 * 微信支付 API v3 核心工具
 *
 * 依赖 Node.js 原生 crypto / https 模块，无需额外安装 SDK
 *
 * 环境变量（在 Vercel Dashboard 中配置）：
 *   WECHAT_PAY_APPID        - 服务商或普通商户的 AppID
 *   WECHAT_PAY_MCHID        - 商户号
 *   WECHAT_PAY_API_V3_KEY   - APIv3 密钥（32字节，在商户平台设置）
 *   WECHAT_PAY_MCH_SERIAL   - 商户证书序列号（十六进制字符串）
 *   WECHAT_PAY_PRIVATE_KEY  - 商户 API 私钥（PKCS#1/PKCS#8 PEM 格式）
 *   WECHAT_PAY_NOTIFY_URL   - 支付回调 URL（如 https://www.next.digit3ds.com/api/pay/notify）
 */

import crypto from 'crypto'
import https from 'https'

// ============================================================
// 配置
// ============================================================

const APPID = process.env.WECHAT_PAY_APPID || ''
const MCHID = process.env.WECHAT_PAY_MCHID || ''
const API_V3_KEY = process.env.WECHAT_PAY_API_V3_KEY || ''
const MCH_SERIAL = process.env.WECHAT_PAY_MCH_SERIAL || ''
const PRIVATE_KEY = (process.env.WECHAT_PAY_PRIVATE_KEY || '').replace(/\\n/g, '\n')
const NOTIFY_URL = process.env.WECHAT_PAY_NOTIFY_URL || ''

const WECHAT_BASE = 'api.mch.weixin.qq.com'

/** 金额单位：分 → 元 */
export function toCents(yuan: number): number {
  return Math.round(yuan * 100)
}

// ============================================================
// 签名工具
// ============================================================

/** 生成 APIv3 请求签名 */
function sign(method: string, urlPath: string, timestamp: string, nonce: string, body: string): string {
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(message)
  signer.end()
  const signature = signer.sign(PRIVATE_KEY, 'base64')
  return signature
}

/** 生成 Authorization header */
function authHeader(method: string, urlPath: string, body: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')
  const signature = sign(method, urlPath, timestamp, nonce, body)
  return `WECHATPAY2-SHA256-RSA2048 mchid="${MCHID}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${MCH_SERIAL}",signature="${signature}"`
}

// ============================================================
// HTTPS 请求封装
// ============================================================

interface WechatApiResponse {
  code: number
  body: any
  headers?: Record<string, string>
}

function httpsRequest(method: string, path: string, body: string, extraHeaders?: Record<string, string>): Promise<WechatApiResponse> {
  return new Promise((resolve, reject) => {
    const auth = authHeader(method, path, body)
    const postData = method === 'GET' ? undefined : body

    const options: https.RequestOptions = {
      hostname: WECHAT_BASE,
      port: 443,
      path,
      method,
      headers: {
        'Authorization': auth,
        'User-Agent': 'talktalk/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(res.headers)) {
          if (v) headers[k] = String(v)
        }
        try {
          const parsed = data ? JSON.parse(data) : null
          resolve({ code: res.statusCode || 0, body: parsed, headers })
        } catch {
          resolve({ code: res.statusCode || 0, body: data, headers })
        }
      })
    })

    req.on('error', reject)
    if (postData) req.write(postData)
    req.end()
  })
}

// ============================================================
// 微信支付统一下单
// ============================================================

/** 下单模式 */
export type PayMode = 'native' | 'h5'

/** 统一下单参数 */
export interface UnifiedOrderParams {
  description: string
  outTradeNo: string
  amount: number // 元
  payerClientIp: string
  mode: PayMode
}

/** 统一下单结果 */
export interface UnifiedOrderResult {
  /** Native 模式：二维码 URL */
  codeUrl?: string
  /** H5 模式：跳转 URL */
  h5Url?: string
  /** 预支付 ID */
  prepayId: string
}

/**
 * 调用微信支付统一下单 API
 * https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_1.shtml
 */
export async function unifiedOrder(params: UnifiedOrderParams): Promise<UnifiedOrderResult> {
  const totalFee = toCents(params.amount)

  const bodyObj: Record<string, any> = {
    appid: APPID,
    mchid: MCHID,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: NOTIFY_URL,
    amount: {
      total: totalFee,
      currency: 'CNY',
    },
  }

  if (params.mode === 'native') {
    // Native 模式：扫码支付
  } else {
    // H5 模式：浏览器跳转支付
    bodyObj.scene_info = {
      payer_client_ip: params.payerClientIp,
      h5_info: {
        type: 'Wap',
      },
    }
  }

  const endpoint = params.mode === 'native'
    ? '/v3/pay/transactions/native'
    : '/v3/pay/transactions/h5'

  const res = await httpsRequest('POST', endpoint, JSON.stringify(bodyObj))

  if (res.code !== 200 && res.code !== 201 && res.code !== 204) {
    throw new Error(`微信支付下单失败 (${res.code}): ${JSON.stringify(res.body)}`)
  }

  return {
    codeUrl: res.body?.code_url,
    h5Url: res.body?.h5_url,
    prepayId: res.body?.prepay_id || '',
  }
}

// ============================================================
// 订单查询
// ============================================================

export interface WechatOrderStatus {
  tradeState: string           // SUCCESS / REFUND / NOTPAY / CLOSED / etc.
  transactionId?: string      // 微信支付订单号
  bankType?: string
  successTime?: string
  tradeStateDesc?: string
}

/**
 * 查询微信支付订单状态
 * https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_2.shtml
 */
export async function queryOrder(outTradeNo: string): Promise<WechatOrderStatus> {
  const path = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${MCHID}`
  const res = await httpsRequest('GET', path, '')

  if (res.code === 200 || res.code === 201) {
    return {
      tradeState: res.body.trade_state || '',
      transactionId: res.body.transaction_id,
      bankType: res.body.bank_type,
      successTime: res.body.success_time,
      tradeStateDesc: res.body.trade_state_desc,
    }
  }

  if (res.code === 404) {
    return { tradeState: 'NOTPAY' }
  }

  throw new Error(`查询订单失败 (${res.code}): ${JSON.stringify(res.body)}`)
}

// ============================================================
// 回调通知验证
// ============================================================

const platformCertCache = new Map<string, { cert: string; expiresAt: number }>()

/**
 * 获取微信平台证书（带缓存，最多每小时刷新一次）
 */
async function getPlatformCert(serialNo: string): Promise<string> {
  const cached = platformCertCache.get(serialNo)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.cert
  }

  const res = await httpsRequest('GET', '/v3/certificates', '')
  if (res.code !== 200) {
    throw new Error(`获取平台证书失败: ${JSON.stringify(res.body)}`)
  }

  const certs = res.body?.data || []
  for (const c of certs) {
    if (c.serial_no === serialNo) {
      // 需要解密 encrypt_certificate
      const decoded = decryptCertificate(c.encrypt_certificate)
      const expiresAt = new Date(c.expire_time).getTime()

      platformCertCache.set(serialNo, { cert: decoded, expiresAt })
      return decoded
    }
  }

  throw new Error(`未找到序列号 ${serialNo} 对应的平台证书`)
}

/** 解密证书内容 */
function decryptCertificate(encrypted: { algorithm: string; nonce: string; associated_data: string; ciphertext: string }): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(API_V3_KEY, 'utf-8').slice(0, 32),
    Buffer.from(encrypted.nonce, 'utf-8').slice(0, 12)
  )
  decipher.setAAD(Buffer.from(encrypted.associated_data, 'utf-8'))
  decipher.setAuthTag(Buffer.from(encrypted.ciphertext, 'base64').slice(-16))
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64').slice(0, -16)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf-8')
}

/** 微信回调通知结构 */
export interface WechatPayNotify {
  id: string
  create_time: string
  event_type: string
  resource_type: string
  resource: {
    algorithm: string
    ciphertext: string
    associated_data: string
    nonce: string
    original_type: string
  }
  summary: string
}

/** 解密后的支付结果 */
export interface DecryptedPayResult {
  appid: string
  mchid: string
  out_trade_no: string
  transaction_id: string
  trade_type: string
  trade_state: string
  trade_state_desc: string
  bank_type: string
  attach: string
  success_time: string
  payer: { openid: string }
  amount: {
    total: number
    payer_total: number
    currency: string
    payer_currency: string
  }
}

/**
 * 验证并解密微信支付回调通知
 * 返回已解密的支付结果，保证签名有效
 */
export async function verifyAndDecryptNotify(
  body: string,
  wechatSignature: string,
  wechatTimestamp: string,
  wechatNonce: string,
  wechatSerial: string
): Promise<DecryptedPayResult> {
  // 1. 获取微信平台证书
  const cert = await getPlatformCert(wechatSerial)

  // 2. 验证签名
  const message = `${wechatTimestamp}\n${wechatNonce}\n${body}\n`
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(message)
  verifier.end()
  const isValid = verifier.verify(cert, wechatSignature, 'base64')

  if (!isValid) {
    throw new Error('微信支付回调签名验证失败')
  }

  // 3. 解析并解密 resource
  const notify = JSON.parse(body) as WechatPayNotify
  const resource = notify.resource

  // 4. 解密 AES-GCM 加密的支付结果
  const aad = Buffer.from(resource.associated_data, 'utf-8')
  const nonce = Buffer.from(resource.nonce, 'utf-8')
  const ciphertext = Buffer.from(resource.ciphertext, 'base64')

  const key = Buffer.from(API_V3_KEY, 'utf-8').slice(0, 32)
  const authTag = ciphertext.slice(-16)
  const encrypted = ciphertext.slice(0, -16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce.slice(0, 12))
  decipher.setAAD(aad)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

  return JSON.parse(decrypted.toString('utf-8'))
}

// ============================================================
// 工具：验证配置是否完整
// ============================================================

export function isWechatPayConfigured(): boolean {
  return !!(APPID && MCHID && API_V3_KEY && MCH_SERIAL && PRIVATE_KEY && NOTIFY_URL)
}

export function getConfigStatus(): Record<string, boolean> {
  return {
    APPID: !!APPID,
    MCHID: !!MCHID,
    API_V3_KEY: !!API_V3_KEY,
    MCH_SERIAL: !!MCH_SERIAL,
    PRIVATE_KEY: !!PRIVATE_KEY,
    NOTIFY_URL: !!NOTIFY_URL,
  }
}
