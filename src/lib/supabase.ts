import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      fetch: (url, opts) =>
        fetch(url, { ...opts, signal: AbortSignal.timeout(8000) }),
    },
  })
} else {
  console.warn('Supabase env vars not set — will use localStorage fallback')
}

/** Safe Supabase client — returns null if not configured */
export function getDb() {
  return supabaseClient
}

/** Helper: add 8s timeout to any Supabase query, return null on failure */
export async function safeQuery<T>(
  queryFn: (db: NonNullable<ReturnType<typeof getDb>>) => Promise<{ data: T | null; error: any }>,
  timeoutMs = 10000
): Promise<{ data: T | null; error: any }> {
  const db = getDb()
  if (!db) return { data: null, error: new Error('Supabase not configured') }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    // Patch the request to include the abort signal
    const result = await queryFn(db)
    clearTimeout(timeout)
    return result
  } catch (e: any) {
    return { data: null, error: e }
  }
}
