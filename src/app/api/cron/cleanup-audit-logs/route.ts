import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * Audit Log Cleanup Job
 * Retention: 90 Days
 * History is safely stored in Google Sheets before deletion.
 */
export async function GET(request: Request) {
    try {
        // Security Check
        const authHeader = request.headers.get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const retentionDays = 90
        const cutoffDate = subDays(new Date(), retentionDays)

        console.log(`[Cleanup] Deleting audit logs older than ${retentionDays} days (before ${cutoffDate.toISOString()})`)

        const result = await prisma.activityLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate
                }
            }
        })

        return NextResponse.json({
            success: true,
            deletedCount: result.count,
            cutoffDate: cutoffDate.toISOString(),
            message: `Successfully pruned ${result.count} old audit logs.`
        })

    } catch (error: any) {
        console.error('Audit Log Cleanup Failed:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
