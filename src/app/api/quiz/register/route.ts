import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { signParticipantToken } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { teamName } = await req.json()

    if (!teamName || typeof teamName !== 'string') {
      return NextResponse.json({ error: 'Team name is required.' }, { status: 400 })
    }

    const trimmed = teamName.trim()
    if (trimmed.length < 2) {
      return NextResponse.json({ error: 'Team name must be at least 2 characters.' }, { status: 400 })
    }
    if (trimmed.length > 60) {
      return NextResponse.json({ error: 'Team name must be under 60 characters.' }, { status: 400 })
    }

    // Check quiz is open
    const { data: settingRaw } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'quiz_open')
      .single()

    const setting = settingRaw as { value: string } | null
    if (!setting || setting.value !== 'true') {
      return NextResponse.json({ error: 'The quiz is currently closed. Please wait for it to open.' }, { status: 403 })
    }

    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ')

    // Check if team already participated
    const { data: existingRaw } = await supabaseAdmin
      .from('participants')
      .select('id, completed_at')
      .eq('team_name_normalized', normalized)
      .single()

    const existing = existingRaw as { id: string; completed_at: string | null } | null

    if (existing) {
      if (existing.completed_at) {
        return NextResponse.json(
          { error: 'This team has already completed the quiz. Each team can only attempt once.' },
          { status: 409 }
        )
      } else {
        return NextResponse.json(
          { error: 'This team name is already in use. If this is your team, please refresh the page.' },
          { status: 409 }
        )
      }
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                req.headers.get('x-real-ip') ||
                'unknown'

    const participantId = uuidv4()
    const sessionToken = uuidv4()

    const { error: insertError } = await supabaseAdmin
      .from('participants')
      .insert([{
        id: participantId,
        team_name: trimmed,
        team_name_normalized: normalized,
        ip_address: ip,
        session_token: sessionToken,
        total_score: 0,
      }] as never[])

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'This team name is already taken. Please choose a different name.' },
          { status: 409 }
        )
      }
      throw insertError
    }

    const jwtToken = await signParticipantToken(participantId, trimmed)

    return NextResponse.json({
      success: true,
      sessionToken: jwtToken,
      participantId,
      teamName: trimmed,
    })
  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
