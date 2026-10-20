import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

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

// POST /api/admin/reset - clear all participants and answers (keep questions)
export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!csrfSafe(req)) return NextResponse.json({ error: 'CSRF check failed.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (body.confirm !== 'DELETE_ALL_DATA') {
    return NextResponse.json({ error: 'Confirmation required. Send { confirm: "DELETE_ALL_DATA" }.' }, { status: 400 })
  }

  // Delete all answers first (FK constraint), then participants
  await supabaseAdmin.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabaseAdmin.from('participants').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  return NextResponse.json({ success: true })
}
