import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'

const secretKey = process.env.JWT_SECRET || 'secret-key-achariya'
const encodedKey = new TextEncoder().encode(secretKey)

export async function createSession(userId: number, userType: 'user' | 'admin' = 'user', role?: string) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h as per 1.4

    // Get client IP for tracking (1.4)
    const clientIp = (await headers()).get('x-forwarded-for')?.split(',')[0] || 'unknown'

    const session = await new SignJWT({ userId, userType, role, ip: clientIp })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(encodedKey)

    const cookieStore = await cookies()
    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    })
}

export async function getSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value
    if (!session) return null

    try {
        const { payload } = await jwtVerify(session, encodedKey, {
            algorithms: ['HS256'],
        })
        return payload
    } catch (error) {
        // console.log('Failed to verify session')
        return null
    }
}

export async function rotateSession() {
    const session = await getSession()
    if (!session) return

    // Create a new session with current data to refresh expiry and rotation (1.4)
    await createSession(session.userId as number, session.userType as 'user' | 'admin', session.role as string | undefined)
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}
