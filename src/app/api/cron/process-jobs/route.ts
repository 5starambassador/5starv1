import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dispatchCampaignBatch } from '@/app/campaign-dispatcher'

export const dynamic = 'force-dynamic' // Ensure this route is never cached
export const maxDuration = 60 // Allow longer execution time if possible (Vercel specific)

export async function GET(request: Request) {
    // 1. Fetch available job
    // We use a transaction or simple update to "lock" the job
    // Ideally: UPDATE Job SET status='PROCESSING' WHERE id = (SELECT id FROM Job WHERE status='PENDING' ORDER BY createdAt LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *
    // But Prisma doesn't support "SKIP LOCKED" easily without raw SQL.
    // For simplicity/low-concurrency, we'll just findFirst then update.

    try {
        // 1. Fetch and Lock the oldest PENDING job atomically
        // Using update with a where filter ensures only one worker picks up the job
        const jobToProcess = await prisma.job.findFirst({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            select: { id: true }
        })

        if (!jobToProcess) {
            return NextResponse.json({ success: true, message: 'No jobs pending' })
        }

        // Atomic update to mark as PROCESSING
        const job = await prisma.job.update({
            where: {
                id: jobToProcess.id,
                status: 'PENDING' // Safety check: still pending?
            },
            data: { status: 'PROCESSING' }
        })

        console.log(`[JobProcessor] Locked Job #${job.id} Type: ${job.type} at ${new Date().toISOString()}`)

        // 2. Execute Logic based on Type
        if (job.type === 'CAMPAIGN_BATCH') {
            const { campaignId } = job.payload as any

            // Run the dispatcher
            const result = await dispatchCampaignBatch(campaignId)

            if (result.success) {
                await prisma.job.update({
                    where: { id: job.id },
                    data: { status: 'COMPLETED' }
                })
            } else {
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: 'FAILED',
                        error: result.error || 'Unknown error'
                    }
                })
            }
        } else if (job.type === 'SYSTEM_REENGAGEMENT') {
            const { executeReengagementLogic } = await import('@/app/engagement-actions')
            try {
                const count = await executeReengagementLogic()
                await prisma.job.update({
                    where: { id: job.id },
                    data: { status: 'COMPLETED' }
                })
            } catch (err: any) {
                await prisma.job.update({
                    where: { id: job.id },
                    data: { status: 'FAILED', error: err.message || 'Re-engagement failed' }
                })
            }
        } else if (job.type === 'SYSTEM_ENFORCEMENT') {
            const { executeCampusEnforcementLogic } = await import('@/app/campus-enforcement-actions')
            try {
                const result = await executeCampusEnforcementLogic()
                await prisma.job.update({
                    where: { id: job.id },
                    data: { status: 'COMPLETED' }
                })
            } catch (err: any) {
                await prisma.job.update({
                    where: { id: job.id },
                    data: { status: 'FAILED', error: err.message || 'Enforcement failed' }
                })
            }
        } else {
            // Unknown job type
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'FAILED', error: 'Unknown job type' }
            })
        }

        // 3. Recursive Call?
        // If there are more jobs, we could trigger ourselves again, but let's keep it simple.
        // The cron/scheduler should call this endpoint periodically.

        return NextResponse.json({ success: true, jobId: job.id })

    } catch (error: any) {
        console.error('[JobProcessor] Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
