
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function auditWaiverHistory() {
    const users = ['Razia', 'Alagammai', 'RAJA', 'Venpa']
    const history = await prisma.settlement.findMany({
        where: {
            user: { fullName: { in: users } },
            status: 'Processed'
        },
        include: { user: { select: { fullName: true, role: true } } },
        orderBy: { createdAt: 'desc' }
    })

    console.log('--- Processed Settlements for Group A Users ---')
    history.forEach(s => {
        console.log(`User: ${s.user.fullName} (${s.user.role}) | Amount: ₹${s.amount} | Type: ${s.benefitType} | Remarks: ${s.remarks} | Status: ${s.status}`)
    })
}

auditWaiverHistory().catch(console.error).finally(() => prisma.$disconnect())
