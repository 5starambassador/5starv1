
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Diagnostic for Krithika (ACH26-P00056) ---')
        const user = await prisma.user.findFirst({
            where: { referralCode: 'ACH26-P00056' },
            include: {
                referrals: true
            }
        })

        if (!user) {
            console.log('User not found')
            return
        }

        console.log(`User: ${user.fullName} | Role: ${user.role} | AcademicYear: ${user.academicYear}`)
        console.log(`Total Referrals: ${user.referrals.length}`)

        user.referrals.forEach(r => {
            console.log(`  - LeadID: ${r.leadId} | Student: ${r.studentName} | Status: ${r.leadStatus} | AdmittedYear: ${r.admittedYear} | InternalYear: ${r.academicYear}`)
        })

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
