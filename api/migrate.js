/**
 * POST /api/migrate
 *
 * 执行数据库迁移 SQL。
 * 只在开发/管理环境下使用，用 service_role key 通过 pg_dump 接口执行原始 SQL。
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const SQL = `
ALTER TABLE question_types ADD COLUMN IF NOT EXISTS discovery_flow TEXT DEFAULT '';
ALTER TABLE question_types ADD COLUMN IF NOT EXISTS interaction_flow TEXT DEFAULT '';
ALTER TABLE question_types ADD COLUMN IF NOT EXISTS animation_flow TEXT DEFAULT '';
`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  try {
    // 使用 Supabase 的 /pg/ 端点执行 SQL（需服务端 service_role key）
    const pgRes = await fetch(`${SUPABASE_URL}/pg/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: SQL }),
    })

    const text = await pgRes.text()
    if (!pgRes.ok) {
      return res.status(200).json({ success: false, error: text })
    }

    return res.status(200).json({ success: true })
  } catch (e) {
    return res.status(200).json({ success: false, error: e.message })
  }
}
