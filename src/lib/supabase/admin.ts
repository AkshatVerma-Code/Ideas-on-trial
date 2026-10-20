import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let _adminClient: ReturnType<typeof createClient<Database>> | null = null

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return !!(url && key && url.startsWith('http') && !url.includes('your_supabase_project_url'))
}

export function getSupabaseAdmin() {
  if (!_adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey || !supabaseUrl.startsWith('http') || supabaseUrl.includes('your_supabase_project_url')) {
      throw new Error(
        'Supabase is not configured. Please set your real NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in ideas-on-trial/.env.local'
      )
    }

    _adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  }
  return _adminClient
}

// Backwards-compat proxy used across API routes
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    return getSupabaseAdmin()[prop as keyof ReturnType<typeof createClient<Database>>]
  },
})
