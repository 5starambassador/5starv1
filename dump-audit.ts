import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function main() {
    console.log('--- STARTING SENIOR EXPERT AUDIT: DEEP DIVE ---')

    // Find discrepant users
    const discrepantUsers = await prisma.user.findMany({
        where: {
            status: 'Active' as any,
            paymentStatus: { in: ['Pending', 'Failed'] }
        },
        include: {
            payments: true,
            students: true
        }
    })

    const detailedAudit = discrepantUsers.map(u => {
        const hasSuccessPayment = u.payments.some(p => p.paymentStatus === 'Success' || p.paymentStatus === 'Completed')
        const linkedStudentsCount = u.students.length

        return {
            id: u.userId,
            name: u.fullName,
            mobile: u.mobileNumber,
            role: u.role,
            createdAt: u.createdAt,
            hasSuccessPayment,
            linkedStudentsCount,
            studentNames: u.students.map(s => s.fullName).join(', '),
            paymentStatus: u.paymentStatus
        }
    })

    fs.writeFileSync('detailed-audit.json', JSON.stringify(detailedAudit, null, 2))

    const triggeredBySync = detailedAudit.filter(a => !a.hasSuccessPayment && a.linkedStudentsCount > 0)
    const pureManualAnomalies = detailedAudit.filter(a => !a.hasSuccessPayment && a.linkedStudentsCount === 0)

    console.log(`TOTAL ANOMALIES (Active but No Payment): ${detailedAudit.length}`)
    console.log(`TRIGGERED BY STUDENT SYNC (Has Active Student): ${triggeredBySync.length}`)
    console.log(`PURE MANUAL/OTHER ANOMALIES (No Student): ${pureManualAnomalies.length}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
