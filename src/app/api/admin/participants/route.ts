import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? await verifyAdminToken(token) : false
}

// GET /api/admin/participants
export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ participants: [], needsConfig: true })
  }

  try {
    const { data: participants, error } = await supabaseAdmin
      .from('participants')
      .select('id, team_name, started_at, completed_at, total_score, ip_address')
      .order('started_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message, participants: [] }, { status: 500 })

    return NextResponse.json({ participants: participants || [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg, participants: [] }, { status: 500 })
  }
}

// DELETE /api/admin/participants?id=xxx (disqualify/remove)
export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required.' }, { status: 400 })

    const { error } = await supabaseAdmin.from('participants').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
