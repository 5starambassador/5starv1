
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function manualUpdate() {
    console.log('--- MANUALLY UPDATING LEAD 654 TO 2026-2027 ---')

    const lead = await prisma.referralLead.update({
        where: { leadId: 654 },
        data: { admittedYear: '2026-2027' }
    })

    console.log('Updated Lead:', JSON.stringify(lead, null, 2))
    console.log('--- UPDATE COMPLETE ---')
}

manualUpdate().catch(console.error).finally(() => prisma.$disconnect())
