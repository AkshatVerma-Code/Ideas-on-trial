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

// GET /api/admin/settings
export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      settings: {
        quiz_open: 'false',
        default_timer_seconds: '30',
        quiz_title: 'Ideas on Trial - Round 0',
        quiz_subtitle: 'The Startup Courtroom Quiz',
      },
      needsConfig: true,
    })
  }

  try {
    const { data, error } = await supabaseAdmin.from('settings').select('key, value')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []) as { key: string; value: string }[]
    const settings: Record<string, string> = {
      quiz_open: 'false',
      default_timer_seconds: '30',
      quiz_title: 'Ideas on Trial - Round 0',
      quiz_subtitle: 'The Startup Courtroom Quiz',
    }
    rows.forEach(s => { settings[s.key] = s.value })

    return NextResponse.json({ settings })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/admin/settings - update a setting
export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!csrfSafe(req)) return NextResponse.json({ error: 'CSRF check failed.' }, { status: 403 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured in .env.local' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value required.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert([{ key, value: sanitize(String(value)), updated_at: new Date().toISOString() }] as never[])

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
