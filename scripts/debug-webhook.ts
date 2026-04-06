import prisma from '../src/lib/prisma'

async function debug() {
    console.log("--- DETAILED LOG INVESTIGATION ---")
    
    // Check most recent 15 logs
    const recentLogs = await prisma.whatsAppLog.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' }
    })
    
    recentLogs.forEach(log => {
        console.log(`[${log.createdAt.toISOString()}] ID: ${log.id} | Mobile: ${log.mobile} | Status: ${log.status} | RefId: ${log.refId}`)
    })

    // Look for the specific mobile number from the user's screenshot if visible
    // In screenshot: 9500906385, 9952049987, 9442266704, 8870127218, 9791858504
    const userMobiles = ['9500906385', '9952049987', '9442266704', '8870127218', '9791858504'];
    
    console.log("\n--- USER MOBILES CHECK ---")
    for (const mobile of userMobiles) {
        const log = await prisma.whatsAppLog.findFirst({
            where: { mobile: mobile },
            orderBy: { createdAt: 'desc' }
        })
        if (log) {
            console.log(`Mobile: ${mobile} | Status: ${log.status} | RefId: ${log.refId} | Created: ${log.createdAt.toISOString()}`)
        }
    }
}

debug().finally(() => process.exit())
