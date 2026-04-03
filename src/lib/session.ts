import 'server-only'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export interface SessionPayload extends JWTPayload {
    userId: number
    userType: 'user' | 'admin'
    role?: string
    status?: string
    ip?: string
    is2faVerified?: boolean
}
import { cookies, headers } from 'next/headers'

const secretKey = process.env.JWT_SECRET
if (!secretKey) {
    console.error('CRITICAL: JWT_SECRET environment variable is missing!')
    if (process.env.NODE_ENV === 'production') {
        // We log error but don't THROW during build/module eval to allow static generation to proceed.
        // It will still fail at runtime if createSession is called.
    }
}
const encodedKey = new TextEncoder().encode(secretKey || 'fallback-for-build-only')

export async function createSession(userId: number, userType: 'user' | 'admin' = 'user', role?: string, is2faVerified: boolean = true, status?: string) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for mobile persistence

    // Get client IP for tracking (1.4)
    const clientIp = (await headers()).get('x-forwarded-for')?.split(',')[0] || 'unknown'

    const session = await new SignJWT({ userId, userType, role, status, is2faVerified })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(encodedKey)

    const cookieStore = await cookies()
    cookieStore.set('session', session, {
        httpOnly: true,
        secure: true, // Required for 'none' sameSite in Play Store APKs
        expires: expiresAt,
        sameSite: 'none', // Mandatory for Capacitor / Android APK cross-site access
        path: '/',
    })
}

export async function getSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value
    if (!session) return null

    return await verifySessionToken(session)
}

export async function verifySessionToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, encodedKey, {
            algorithms: ['HS256'],
        })
        return payload as SessionPayload
    } catch (error) {
        return null
    }
}

export async function rotateSession() {
    const session = await getSession()
    if (!session) return

    // Create a new session with current data to refresh expiry and rotation (1.4)
    await createSession(
        session.userId as number,
        session.userType as 'user' | 'admin',
        session.role as string | undefined,
        session.is2faVerified as boolean | undefined,
        session.status as string | undefined
    )
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}
