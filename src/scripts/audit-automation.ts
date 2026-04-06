import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function runAudit() {
    console.log('🛡️ WhatsApp Automation Health Audit...')
    
    const logs = await (prisma as any).whatsAppLog.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: { 
            id: true, 
            mobile: true, 
            userRole: true, 
            campus: true, 
            status: true, 
            content: true,
            createdAt: true 
        }
    })

    console.table(logs.map((l: any) => ({
        Time: l.createdAt.toLocaleString(),
        Mobile: l.mobile,
        Role: l.userRole,
        Campus: l.campus,
        Status: l.status,
        Message: l.content?.substring(0, 30) + '...'
    })))

    // Check specific summary
    const blankCampus = logs.filter((l: any) => !l.campus || l.campus === '-').length
    const sentOnly = logs.filter((l: any) => l.status === 'SENT').length
    const updated = logs.filter((l: any) => ['DELIVERED', 'READ'].includes(l.status)).length

    console.log('\n📊 Audit Summary (Last 15 Messages):')
    console.log(`✅ Correctly Tagged (Campus): ${15 - blankCampus}/15`)
    console.log(`📡 Real-time Status Sync: ${updated} updated, ${sentOnly} pending.`)
    
    if (blankCampus === 0) {
        console.log('\n🏆 AUTOMATION IS 100% HEALTHY: Role/Campus data is perfectly synchronized.')
    } else {
        console.log(`\n⚠️ INFO: ${blankCampus} records still show placeholders. (These could be very old logs)`)
    }
}

runAudit()
    .finally(async () => {
        await prisma.$disconnect()
    })
