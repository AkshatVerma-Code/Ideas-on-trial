import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyParticipantToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    const token = auth?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyParticipantToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })

    // Check participant exists and hasn't completed
    const { data: participantRaw } = await supabaseAdmin
      .from('participants')
      .select('id, completed_at, total_score')
      .eq('id', payload.participantId)
      .single()

    const participant = participantRaw as { id: string; completed_at: string | null; total_score: number } | null

    if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

    if (participant.completed_at) {
      return NextResponse.json({ error: 'Quiz already completed', completed: true }, { status: 403 })
    }

    // Fetch questions with options (ordered)
    const { data: questionsRaw, error } = await supabaseAdmin
      .from('questions')
      .select(`
        id,
        text,
        timer_seconds,
        display_order,
        options (
          id,
          text,
          weight,
          display_order
        )
      `)
      .order('display_order', { ascending: true })

    if (error) throw error

    type RawOption = { id: string; text: string; weight: number; display_order: number }
    type RawQuestion = { id: string; text: string; timer_seconds: number; display_order: number; options: RawOption[] }

    const questions = (questionsRaw ?? []) as unknown as RawQuestion[]

    const sorted = questions.map(q => ({
      ...q,
      options: [...(q.options || [])].sort((a, b) => a.display_order - b.display_order),
    }))

    // Get already answered question IDs
    const { data: answeredRaw } = await supabaseAdmin
      .from('answers')
      .select('question_id, option_id, score')
      .eq('participant_id', payload.participantId)

    const answered = (answeredRaw ?? []) as { question_id: string; option_id: string | null; score: number }[]

    return NextResponse.json({
      questions: sorted,
      answeredQuestions: answered,
      participantId: payload.participantId,
      teamName: payload.teamName,
    })
  } catch (err) {
    console.error('Questions fetch error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
