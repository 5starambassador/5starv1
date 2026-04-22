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
            const result = (await dispatchCampaignBatch(campaignId)) as any

            if (result.success) {
                // If the dispatcher signaled there's more work (batch limit reached),
                // set back to PENDING so it can be picked up again.
                // Otherwise mark as COMPLETED.
                await prisma.job.update({
                    where: { id: job.id },
                    data: { status: result.hasMore ? 'PENDING' : 'COMPLETED' }
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
        // If there are more jobs, trigger ourselves again to process sequentially
        const nextJob = await prisma.job.findFirst({
            where: { status: 'PENDING' },
            select: { id: true }
        })

        if (nextJob) {
            let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL
            if (!baseUrl && process.env.VERCEL_URL) {
                baseUrl = `https://${process.env.VERCEL_URL}`
            }
            if (!baseUrl && process.env.NODE_ENV === 'development') {
                baseUrl = 'http://localhost:3001' // Default to our dev port
            } else if (!baseUrl) {
                baseUrl = 'http://localhost:3000'
            }

            // Trigger next run (Fire-and-forget)
            fetch(`${baseUrl}/api/cron/process-jobs`, { method: 'GET', cache: 'no-store' }).catch(err => console.error('[JobProcessor] Failed to trigger next job', err))
        }

        return NextResponse.json({ success: true, jobId: job.id, nextPending: !!nextJob })

    } catch (error: any) {
        console.error('[JobProcessor] Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
