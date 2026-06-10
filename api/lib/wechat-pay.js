/**
 * 微信支付 API v3 核心工具（JS 版）
 */
const crypto = require('crypto');
const https = require('https');

const APPID = process.env.WECHAT_PAY_APPID || '';
const MCHID = process.env.WECHAT_PAY_MCHID || '';
const API_V3_KEY = process.env.WECHAT_PAY_API_V3_KEY || '';
const MCH_SERIAL = process.env.WECHAT_PAY_MCH_SERIAL || '';
const PRIVATE_KEY = (process.env.WECHAT_PAY_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const NOTIFY_URL = process.env.WECHAT_PAY_NOTIFY_URL || '';
const WECHAT_BASE = 'api.mch.weixin.qq.com';

function toCents(yuan) {
  return Math.round(yuan * 100);
}

function sign(method, urlPath, timestamp, nonce, body) {
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  return signer.sign(PRIVATE_KEY, 'base64');
}

function authHeader(method, urlPath, body) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = sign(method, urlPath, timestamp, nonce, body);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${MCHID}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${MCH_SERIAL}",signature="${signature}"`;
}

function httpsRequest(method, path, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const auth = authHeader(method, path, body);
    const postData = method === 'GET' ? undefined : body;

    const options = {
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
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const headers = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (v) headers[k] = String(v);
        }
        try {
          resolve({ code: res.statusCode || 0, body: data ? JSON.parse(data) : null, headers });
        } catch {
          resolve({ code: res.statusCode || 0, body: data, headers });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function unifiedOrder(params) {
  const totalFee = toCents(params.amount);

  const bodyObj = {
    appid: APPID,
    mchid: MCHID,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: NOTIFY_URL,
    amount: { total: totalFee, currency: 'CNY' },
  };

  if (params.mode !== 'native') {
    bodyObj.scene_info = {
      payer_client_ip: params.payerClientIp,
      h5_info: { type: 'Wap' },
    };
  }

  const endpoint = params.mode === 'native'
    ? '/v3/pay/transactions/native'
    : '/v3/pay/transactions/h5';

  const res = await httpsRequest('POST', endpoint, JSON.stringify(bodyObj));

  if (res.code !== 200 && res.code !== 201 && res.code !== 204) {
    throw new Error(`微信支付下单失败 (${res.code}): ${JSON.stringify(res.body)}`);
  }

  return {
    codeUrl: res.body?.code_url,
    h5Url: res.body?.h5_url,
    prepayId: res.body?.prepay_id || '',
  };
}

async function queryOrder(outTradeNo) {
  const path = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${MCHID}`;
  const res = await httpsRequest('GET', path, '');

  if (res.code === 200 || res.code === 201) {
    return {
      tradeState: res.body.trade_state || '',
      transactionId: res.body.transaction_id,
      bankType: res.body.bank_type,
      successTime: res.body.success_time,
      tradeStateDesc: res.body.trade_state_desc,
    };
  }

  if (res.code === 404) return { tradeState: 'NOTPAY' };

  throw new Error(`查询订单失败 (${res.code}): ${JSON.stringify(res.body)}`);
}

const platformCertCache = new Map();

async function getPlatformCert(serialNo) {
  const cached = platformCertCache.get(serialNo);
  if (cached && cached.expiresAt > Date.now()) return cached.cert;

  const res = await httpsRequest('GET', '/v3/certificates', '');
  if (res.code !== 200) throw new Error(`获取平台证书失败: ${JSON.stringify(res.body)}`);

  const certs = res.body?.data || [];
  for (const c of certs) {
    if (c.serial_no === serialNo) {
      const decoded = decryptCertificate(c.encrypt_certificate);
      platformCertCache.set(serialNo, { cert: decoded, expiresAt: new Date(c.expire_time).getTime() });
      return decoded;
    }
  }
  throw new Error(`未找到序列号 ${serialNo} 对应的平台证书`);
}

function decryptCertificate(encrypted) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(API_V3_KEY, 'utf-8').slice(0, 32),
    Buffer.from(encrypted.nonce, 'utf-8').slice(0, 12)
  );
  decipher.setAAD(Buffer.from(encrypted.associated_data, 'utf-8'));
  decipher.setAuthTag(Buffer.from(encrypted.ciphertext, 'base64').slice(-16));
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64').slice(0, -16);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf-8');
}

async function verifyAndDecryptNotify(body, wechatSignature, wechatTimestamp, wechatNonce, wechatSerial) {
  const cert = await getPlatformCert(wechatSerial);
  const message = `${wechatTimestamp}\n${wechatNonce}\n${body}\n`;

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(message);
  verifier.end();
  const isValid = verifier.verify(cert, wechatSignature, 'base64');

  if (!isValid) throw new Error('微信支付回调签名验证失败');

  const notify = JSON.parse(body);
  const resource = notify.resource;
  const aad = Buffer.from(resource.associated_data, 'utf-8');
  const nonce = Buffer.from(resource.nonce, 'utf-8');
  const ciphertext = Buffer.from(resource.ciphertext, 'base64');
  const key = Buffer.from(API_V3_KEY, 'utf-8').slice(0, 32);
  const authTag = ciphertext.slice(-16);
  const encrypted = ciphertext.slice(0, -16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce.slice(0, 12));
  decipher.setAAD(aad);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf-8'));
}

function isWechatPayConfigured() {
  return !!(APPID && MCHID && API_V3_KEY && MCH_SERIAL && PRIVATE_KEY && NOTIFY_URL);
}

function getConfigStatus() {
  return { APPID: !!APPID, MCHID: !!MCHID, API_V3_KEY: !!API_V3_KEY, MCH_SERIAL: !!MCH_SERIAL, PRIVATE_KEY: !!PRIVATE_KEY, NOTIFY_URL: !!NOTIFY_URL };
}

module.exports = { toCents, unifiedOrder, queryOrder, verifyAndDecryptNotify, isWechatPayConfigured, getConfigStatus };
