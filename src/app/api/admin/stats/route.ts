import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? await verifyAdminToken(token) : false
}

// GET /api/admin/stats - dashboard summary stats
export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      totalParticipants: 0,
      completedParticipants: 0,
      inProgressParticipants: 0,
      totalQuestions: 0,
      topScorers: [],
      quizOpen: false,
      quizTitle: 'Ideas on Trial',
      needsConfig: true,
      error: 'Supabase credentials are not configured in .env.local',
    })
  }

  try {
    const [
      { count: totalParticipants },
      { count: completedParticipants },
      { data: topScorersRaw },
      { count: questionCount },
      { data: settingsRaw },
      { data: answersRaw },
    ] = await Promise.all([
      supabaseAdmin.from('participants').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('participants').select('id', { count: 'exact', head: true }).not('completed_at', 'is', null),
      supabaseAdmin.from('participants')
        .select('team_name, total_score, completed_at')
        .not('completed_at', 'is', null)
        .order('total_score', { ascending: false })
        .limit(5),
      supabaseAdmin.from('questions').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('settings').select('key, value'),
      supabaseAdmin.from('answers').select('time_taken_seconds').not('time_taken_seconds', 'is', null),
    ])

    const settingsRows = (settingsRaw ?? []) as { key: string; value: string }[]
    const settingsMap: Record<string, string> = {}
    settingsRows.forEach(s => { settingsMap[s.key] = s.value })

    const topScorers = (topScorersRaw ?? []) as { team_name: string; total_score: number }[]

    const answers = (answersRaw ?? []) as { time_taken_seconds: number }[]
    const avgTime = answers.length > 0
      ? Math.round(answers.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0) / answers.length)
      : 0

    return NextResponse.json({
      totalParticipants: totalParticipants || 0,
      completedParticipants: completedParticipants || 0,
      inProgressParticipants: (totalParticipants || 0) - (completedParticipants || 0),
      totalQuestions: questionCount || 0,
      topScorers,
      quizOpen: settingsMap['quiz_open'] === 'true',
      quizTitle: settingsMap['quiz_title'] || 'Ideas on Trial',
      avgTimeSeconds: avgTime,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database query error'
    return NextResponse.json({
      totalParticipants: 0,
      completedParticipants: 0,
      inProgressParticipants: 0,
      totalQuestions: 0,
      topScorers: [],
      quizOpen: false,
      quizTitle: 'Ideas on Trial',
      error: msg,
    })
  }
}
