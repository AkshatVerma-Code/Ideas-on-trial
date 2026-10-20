import { SignJWT, jwtVerify } from 'jose'

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret-change-in-production') {
  throw new Error('JWT_SECRET must be set to a strong random string (at least 32 chars)')
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signAdminToken(): Promise<string> {
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret)
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function signParticipantToken(participantId: string, teamName: string): Promise<string> {
  return await new SignJWT({ participantId, teamName, role: 'participant' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(secret)
}

export async function verifyParticipantToken(token: string): Promise<{
  participantId: string
  teamName: string
} | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.role !== 'participant') return null
    return {
      participantId: payload.participantId as string,
      teamName: payload.teamName as string,
    }
  } catch {
    return null
  }
}
