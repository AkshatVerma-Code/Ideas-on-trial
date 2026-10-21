import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? await verifyAdminToken(token) : false
}

function sanitize(input: string): string {
  return input
    .replace(/[<>'"&]/g, c => ({
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '&': '&amp;',
    }[c] ?? c))
    .trim()
}

type RawOption = { id: string; text: string; weight: number; display_order: number; question_id: string }
type RawQuestion = { id: string; text: string; timer_seconds: number; display_order: number; created_at: string; options: RawOption[] }

// GET /api/admin/questions - list all questions with options
export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      error: 'Supabase credentials are not configured in .env.local',
      questions: [],
      needsConfig: true,
    }, { status: 200 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('questions')
      .select(`id, text, timer_seconds, display_order, created_at, options(id, text, weight, display_order)`)
      .order('display_order', { ascending: true })

    if (error) return NextResponse.json({ error: error.message, questions: [] }, { status: 500 })

    const questions = (data ?? []) as unknown as RawQuestion[]

    const sorted = questions.map(q => ({
      ...q,
      options: [...(q.options || [])].sort((a, b) => a.display_order - b.display_order),
    }))

    return NextResponse.json({ questions: sorted })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg, questions: [] }, { status: 500 })
  }
}

// POST /api/admin/questions - create a question
export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Please configure your Supabase URL and keys in .env.local first.' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { text, timer_seconds, display_order, options } = body

    if (!text?.trim()) return NextResponse.json({ error: 'Question text required.' }, { status: 400 })
    if (!options || options.length < 2) return NextResponse.json({ error: 'At least 2 options required.' }, { status: 400 })

    const { data: questionRaw, error: qErr } = await supabaseAdmin
      .from('questions')
      .insert([{
        text: sanitize(text),
        timer_seconds: timer_seconds || 30,
        display_order: display_order ?? 0,
      }] as never[])
      .select()
      .single()

    if (qErr) throw qErr

    const question = questionRaw as { id: string }

    const optionsToInsert = options.map((o: { text: string; weight: number }, idx: number) => ({
      question_id: question.id,
      text: sanitize(o.text),
      weight: o.weight || 1,
      display_order: idx,
    }))

    const { error: optErr } = await supabaseAdmin.from('options').insert(optionsToInsert as never[])
    if (optErr) throw optErr

    return NextResponse.json({ success: true, id: question.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT /api/admin/questions - update a question
export async function PUT(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Please configure your Supabase URL and keys in .env.local first.' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { id, text, timer_seconds, display_order, options } = body

    if (!id) return NextResponse.json({ error: 'Question ID required.' }, { status: 400 })

    await supabaseAdmin
      .from('questions')
      .update({ text: sanitize(text), timer_seconds, display_order } as never)
      .eq('id', id)

    if (options) {
      await supabaseAdmin.from('options').delete().eq('question_id', id)
      const optionsToInsert = options.map((o: { text: string; weight: number }, idx: number) => ({
        question_id: id,
        text: sanitize(o.text),
        weight: o.weight || 1,
        display_order: idx,
      }))
      await supabaseAdmin.from('options').insert(optionsToInsert as never[])
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/admin/questions?id=xxx&confirm=true
export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Please configure your Supabase URL and keys in .env.local first.' }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const confirm = searchParams.get('confirm')
    if (!id) return NextResponse.json({ error: 'ID required.' }, { status: 400 })
    if (confirm !== 'true') return NextResponse.json({ error: 'Confirmation required. Add ?confirm=true' }, { status: 400 })

    // Delete dependent rows first so FK constraints don't block deletion
    await supabaseAdmin.from('answers').delete().eq('question_id', id)
    await supabaseAdmin.from('options').delete().eq('question_id', id)

    const { error } = await supabaseAdmin.from('questions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
