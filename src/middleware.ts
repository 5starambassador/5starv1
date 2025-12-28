import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// In-memory rate limiting store (Note: In a serverless/multi-instance env, this would be Redis)
const rateLimit = new Map<string, { count: number; resetTime: number }>()

const LIMITS = {
    login: { max: 5, window: 15 * 60 * 1000 }, // 5 per 15 min
    otp: { max: 3, window: 5 * 60 * 1000 },    // 3 per 5 min
    api: { max: 100, window: 60 * 1000 },      // 100 per min
}

function checkRateLimit(key: string, type: keyof typeof LIMITS): boolean {
    const now = Date.now()
    const limit = LIMITS[type]
    const record = rateLimit.get(key)

    if (!record || now > record.resetTime) {
        rateLimit.set(key, { count: 1, resetTime: now + limit.window })
        return true
    }

    if (record.count >= limit.max) {
        return false
    }

    record.count++
    return true
}

export function middleware(request: NextRequest) {
    // 1. Skip middleware for static assets
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
    ) {
        return NextResponse.next()
    }

    // 2. Rate Limiting
    const headersList = request.headers
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown'
    const pathname = request.nextUrl.pathname

    let limitType: keyof typeof LIMITS = 'api'
    if (pathname.includes('login') || pathname.includes('password')) {
        limitType = 'login'
    } else if (pathname.includes('otp')) {
        limitType = 'otp'
    }

    const rateLimitKey = `${ip}:${limitType}`

    if (!checkRateLimit(rateLimitKey, limitType)) {
        return new NextResponse(
            JSON.stringify({ error: 'Too many requests. Please try again later.' }),
            {
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }

    const response = NextResponse.next()

    // 3. Security Headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    // HSTS
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    // CSP - Adjust as needed for external services
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self'",
    ].join('; ')
    response.headers.set('Content-Security-Policy', csp)

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
