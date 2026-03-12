const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkLiveActivity() {
    console.log('--- CHECKING RECENT LIVE ACTIVITY (Last 2 Hours) ---')
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    
    // Check for any log that is NOT 'SENT' (this means a webhook worked)
    const activeLogs = await prisma.whatsAppLog.findMany({
        where: {
            updatedAt: { gte: twoHoursAgo },
            status: { not: 'SENT' }
        },
        orderBy: { updatedAt: 'desc' }
    })
    
    console.log(`Found ${activeLogs.length} logs with status updates from webhooks.`)
    activeLogs.forEach(l => {
        console.log(`- Mobile: ${l.mobile} | Template: ${l.template} | Status: ${l.status} | Updated: ${l.updatedAt}`)
    })

    // Check for any recent failures recorded
    const failures = await prisma.whatsAppLog.findMany({
        where: {
            updatedAt: { gte: twoHoursAgo },
            status: { in: ['FAILED', 'REJECTED'] }
        }
    })
    console.log(`\nFound ${failures.length} recent failures/rejections.`)

    await prisma.$disconnect()
}

checkLiveActivity()
