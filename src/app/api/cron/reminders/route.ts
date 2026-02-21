
import { NextResponse } from 'next/server'
import { reminderService } from '@/lib/reminder-service'

// This route should be called by a cron job (e.g. Vercel Cron)
// Secure it with a secret if exposed publically
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const result = await reminderService.runAll()

        return NextResponse.json({
            success: true,
            summary: result
        })
    } catch (error: any) {
        console.error('Reminder Cron Job Failed:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
