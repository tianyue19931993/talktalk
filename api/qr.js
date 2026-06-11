/**
 * GET /api/qr?data=xxx - 生成二维码图片（同源输出，微信内可长按识别）
 * 替代外部 CDN api.qrserver.com
 */
export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const data = req.query?.data
  if (!data) {
    res.status(400).end('missing data')
    return
  }

  try {
    // 用 qrserver API 代理，但响应从你自己的域名返回
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(data)}`
    const qrRes = await fetch(url)
    const buffer = await qrRes.arrayBuffer()

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.status(200).end(Buffer.from(buffer))
  } catch {
    res.status(502).end('qr generation failed')
  }
}
