import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'quiz_open')
      .single()

    if (error) throw error

    const row = data as { value: string } | null
    return NextResponse.json({ quizOpen: row?.value === 'true' })
  } catch {
    return NextResponse.json({ quizOpen: false })
  }
}
