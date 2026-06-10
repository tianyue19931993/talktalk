import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  } catch (e) {
    console.warn('Supabase client creation failed:', e)
  }
} else {
  console.warn('Supabase env vars not set')
}

export function getDb() {
  return supabaseClient
}

/** Wrapper with manual timeout (no AbortSignal.timeout for compat) */
export async function safeQuery<T>(
  queryFn: (db: NonNullable<ReturnType<typeof getDb>>) => Promise<{ data: T | null; error: any }>,
  timeoutMs = 10000
): Promise<{ data: T | null; error: any }> {
  const db = getDb()
  if (!db) return { data: null, error: new Error('Supabase not configured') }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ data: null, error: new Error('Supabase query timed out') })
    }, timeoutMs)

    queryFn(db)
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((e) => {
        clearTimeout(timer)
        resolve({ data: null, error: e })
      })
  })
}
