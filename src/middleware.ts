import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/session'

// In-memory rate limiting store (Note: In a serverless/multi-instance env, this would be Redis)
const rateLimit = new Map<string, { count: number; resetTime: number }>()

const LIMITS = {
    login: { max: 5, window: 15 * 60 * 1000 }, // 5 per 15 min
    otp: { max: 3, window: 5 * 60 * 1000 },    // 3 per 5 min
    api: { max: 1000, window: 60 * 1000 },      // 1000 per min (Increased for dev)
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

export async function middleware(request: NextRequest) {
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

    // 3. Authentication & Routing Protection
    const sessionToken = request.cookies.get('session')?.value
    let user: any = null

    if (sessionToken) {
        user = await verifySessionToken(sessionToken)
    }

    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')

    // Protected Routes Definition
    const isSuperAdminRoute = pathname.startsWith('/superadmin')
    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/campus') || pathname.startsWith('/finance')
    const isDashboardRoute = pathname.startsWith('/dashboard')

    // Is it a protected route?
    const isProtectedRoute = isSuperAdminRoute || isAdminRoute || isDashboardRoute

    // Logic:
    // A. If Authenticated
    if (user) {
        // 1. If trying to access Auth pages (Login/Register), redirect to dashboard
        if (isAuthRoute) {
            if (user.role === 'Super Admin') return NextResponse.redirect(new URL('/superadmin', request.url))
            if (user.userType === 'admin') return NextResponse.redirect(new URL('/admin', request.url)) // Or their specific dashboard
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Super Admin Only (except for shared modules like approvals)
        if (isSuperAdminRoute && user.role !== 'Super Admin' && !pathname.startsWith('/superadmin/approvals')) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Admin Routes (Campus, Finance, etc.)
        if (isAdminRoute && user.userType !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    } else {
        // B. If Not Authenticated
        // 1. If accessing protected route, redirect to login
        if (isProtectedRoute) {
            const redirectUrl = new URL('/', request.url)
            // Optional: Preserve redirect URL
            // redirectUrl.searchParams.set('from', pathname)
            return NextResponse.redirect(redirectUrl)
        }
    }

    const response = NextResponse.next()

    // 4. Security Headers
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    // HSTS
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    // CSP - Adjust as needed for external services
    const isProd = process.env.NODE_ENV === 'production'
    const csp = [
        "default-src 'self' blob:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.cashfree.com https://payments.cashfree.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "frame-src 'self' https://sdk.cashfree.com https://api.cashfree.com https://payments.cashfree.com",
        isProd
            ? "connect-src 'self' https://api.cashfree.com https://sandbox.cashfree.com https://payments.cashfree.com"
            : "connect-src 'self' http://localhost:3001 http://10.0.2.2:3001 http://192.168.0.250:3001 ws://localhost:3001 ws://10.0.2.2:3001 ws://192.168.0.250:3001 https://api.cashfree.com https://sandbox.cashfree.com https://payments.cashfree.com",
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
        '/((?!_next/static|_next/image|favicon.ico|policies).*)',
    ],
}
