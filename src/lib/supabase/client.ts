import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let _client: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseClient() {
  if (!_client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables.')
    }

    _client = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return _client
}

export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof ReturnType<typeof createClient<Database>>]
  },
})
