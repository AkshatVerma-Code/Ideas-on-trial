import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyParticipantToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    const token = auth?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyParticipantToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })

    // Verify not already completed
    const { data: participantRaw } = await supabaseAdmin
      .from('participants')
      .select('id, completed_at, total_score')
      .eq('id', payload.participantId)
      .single()

    const participant = participantRaw as { id: string; completed_at: string | null; total_score: number } | null
    if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

    if (participant.completed_at) {
      return NextResponse.json({
        success: true,
        totalScore: participant.total_score,
        message: 'Already completed',
      })
    }

    // Calculate total score from answers
    const { data: answersRaw } = await supabaseAdmin
      .from('answers')
      .select('score')
      .eq('participant_id', payload.participantId)

    const answers = (answersRaw ?? []) as { score: number }[]
    const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0)

    // Update participant as completed
    await supabaseAdmin
      .from('participants')
      .update({ completed_at: new Date().toISOString(), total_score: totalScore } as never)
      .eq('id', payload.participantId)

    return NextResponse.json({ success: true, totalScore })
  } catch (err) {
    console.error('Complete quiz error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
