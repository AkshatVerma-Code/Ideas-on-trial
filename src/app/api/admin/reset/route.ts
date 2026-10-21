import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? await verifyAdminToken(token) : false
}

// POST /api/admin/reset - clear all participants and answers (keep questions)
export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete all answers first (FK constraint), then participants
  await supabaseAdmin.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabaseAdmin.from('participants').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  return NextResponse.json({ success: true })
}
