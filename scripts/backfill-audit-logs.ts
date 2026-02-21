import prisma from '../src/lib/prisma'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function backfillLogs() {
    const googleAppUrl = process.env.GOOGLE_SHEETS_AUDIT_URL
    if (!googleAppUrl) {
        console.error('❌ GOOGLE_SHEETS_AUDIT_URL not found!')
        return
    }

    console.log('📊 Counting logs...')
    const totalCount = await prisma.activityLog.count()
    console.log(`✅ Total logs to migrate: ${totalCount}`)

    const CHUNK_SIZE = 500
    const GOOGLE_BATCH_SIZE = 10
    let processedCount = 0
    let successCount = 0
    let failCount = 0

    for (let skip = 0; skip < totalCount; skip += CHUNK_SIZE) {
        console.log(`\n📦 DB Chunk: ${skip / CHUNK_SIZE + 1} (${skip} to ${Math.min(skip + CHUNK_SIZE, totalCount)})`)

        const logs = await prisma.activityLog.findMany({
            orderBy: { createdAt: 'asc' },
            skip,
            take: CHUNK_SIZE
        })

        const adminIds = logs.map(l => l.adminId).filter(Boolean) as number[]
        const userIds = logs.map(l => l.userId).filter(Boolean) as number[]

        const [admins, users] = await Promise.all([
            prisma.admin.findMany({
                where: { adminId: { in: adminIds } },
                select: { adminId: true, adminName: true }
            }),
            prisma.user.findMany({
                where: { userId: { in: userIds } },
                select: { userId: true, fullName: true }
            })
        ])

        for (let i = 0; i < logs.length; i += GOOGLE_BATCH_SIZE) {
            const batch = logs.slice(i, i + GOOGLE_BATCH_SIZE)

            const promises = batch.map(async (log) => {
                let actorName = 'System'
                if (log.adminId) {
                    actorName = admins.find(a => a.adminId === log.adminId)?.adminName || 'Admin'
                } else if (log.userId) {
                    actorName = users.find(u => u.userId === log.userId)?.fullName || 'User'
                }

                const payload = {
                    action: log.action,
                    module: log.module,
                    description: log.description,
                    actorName: actorName,
                    ip: log.ipAddress || 'unknown',
                    requestId: (log.metadata as any)?.requestId || 'LEGACY'
                }

                try {
                    const response = await fetch(googleAppUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        redirect: 'follow'
                    })
                    return response.ok
                } catch (err) {
                    return false
                }
            })

            const results = await Promise.all(promises)
            results.forEach(res => res ? successCount++ : failCount++)
            processedCount += batch.length

            process.stdout.write(`\r🚀 Overall Progress: ${processedCount}/${totalCount} (Success: ${successCount})`)
            await new Promise(r => setTimeout(r, 400))
        }
    }

    console.log('\n\n✨ MIGRATION COMPLETE!')
    console.log(`- Final Success: ${successCount} | Failed: ${failCount}`)
}

backfillLogs().catch(err => console.error('Migration failed:', err))
