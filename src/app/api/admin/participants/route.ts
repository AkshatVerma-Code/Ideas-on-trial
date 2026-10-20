import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? await verifyAdminToken(token) : false
}

function csrfSafe(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const host = req.headers.get('host')
  if (!host) return false
  if (origin && !origin.includes(host)) return false
  if (referer && !referer.includes(`https://${host}`) && !referer.includes(`http://${host}`)) return false
  return true
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

    // Get average time per question per participant from answers
    const { data: answersRaw } = await supabaseAdmin
      .from('answers')
      .select('participant_id, time_taken_seconds')
      .not('time_taken_seconds', 'is', null)

    const answers = (answersRaw ?? []) as { participant_id: string; time_taken_seconds: number }[]
    const timeMap: Record<string, { sum: number; count: number }> = {}
    answers.forEach(a => {
      if (!timeMap[a.participant_id]) timeMap[a.participant_id] = { sum: 0, count: 0 }
      timeMap[a.participant_id].sum += a.time_taken_seconds || 0
      timeMap[a.participant_id].count += 1
    })

    const participantsWithTime = ((participants ?? []) as { id: string; team_name: string; started_at: string; completed_at: string | null; total_score: number; ip_address: string | null }[]).map(p => {
      const t = timeMap[p.id]
      return {
        ...p,
        avgTimeSeconds: t ? Math.round(t.sum / t.count) : 0,
        totalTimeSeconds: t ? t.sum : 0,
      }
    })

    return NextResponse.json({ participants: participantsWithTime })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg, participants: [] }, { status: 500 })
  }
}

// DELETE /api/admin/participants?id=xxx (disqualify/remove)
export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!csrfSafe(req)) return NextResponse.json({ error: 'CSRF check failed.' }, { status: 403 })

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
