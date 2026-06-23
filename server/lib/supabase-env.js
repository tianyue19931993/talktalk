export function getSupabaseEnv() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const serviceRoleKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
  ).trim()

  return {
    url,
    serviceRoleKey,
    configured: !!url && !!serviceRoleKey,
  }
}

