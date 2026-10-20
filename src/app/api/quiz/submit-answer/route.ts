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

    const { questionId, optionId, timeTakenSeconds } = await req.json()

    if (!questionId) return NextResponse.json({ error: 'Question ID required' }, { status: 400 })

    // Verify participant hasn't completed quiz
    const { data: participantRaw } = await supabaseAdmin
      .from('participants')
      .select('id, completed_at')
      .eq('id', payload.participantId)
      .single()

    const participant = participantRaw as { id: string; completed_at: string | null } | null
    if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    if (participant.completed_at) return NextResponse.json({ error: 'Quiz already completed' }, { status: 403 })

    // Check if already answered this question
    const { data: existingAnswer } = await supabaseAdmin
      .from('answers')
      .select('id')
      .eq('participant_id', payload.participantId)
      .eq('question_id', questionId)
      .single()

    if (existingAnswer) {
      return NextResponse.json({ error: 'Question already answered' }, { status: 409 })
    }

    // Get option weight (score)
    let score = 0
    if (optionId) {
      const { data: optionRaw } = await supabaseAdmin
        .from('options')
        .select('weight, question_id')
        .eq('id', optionId)
        .single()

      const option = optionRaw as { weight: number; question_id: string } | null
      if (!option || option.question_id !== questionId) {
        return NextResponse.json({ error: 'Invalid option for this question' }, { status: 400 })
      }
      score = option.weight
    }

    // Insert answer
    await supabaseAdmin.from('answers').insert([{
      participant_id: payload.participantId,
      question_id: questionId,
      option_id: optionId || null,
      score,
      time_taken_seconds: timeTakenSeconds || null,
    }] as never[])

    return NextResponse.json({ success: true, score })
  } catch (err) {
    console.error('Submit answer error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
