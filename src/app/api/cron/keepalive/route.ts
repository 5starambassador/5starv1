import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * KEEPALIVE CRON - Prevents Neon database cold starts.
 * 
 * Called by Vercel Cron every 5 minutes.
 * Keeps the Neon compute active so users never hit the 2-5s cold start delay.
 * This is a lightweight single-row ping - no user data is accessed.
 */
export async function GET(request: Request) {
    // Verify this is called by our cron job (not a public request)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    try {
        const start = Date.now()
        // Lightweight ping - just count active campuses (tiny, indexed, fast)
        await prisma.campus.count({ where: { isActive: true } })
        const duration = Date.now() - start

        console.log(`[KEEPALIVE] DB ping successful in ${duration}ms`)
        return NextResponse.json({ 
            ok: true, 
            duration,
            timestamp: new Date().toISOString() 
        })
    } catch (error: any) {
        console.error('[KEEPALIVE] DB ping failed:', error.message)
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
