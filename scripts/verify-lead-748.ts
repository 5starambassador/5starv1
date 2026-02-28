
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const lead = await prisma.referralLead.findUnique({
            where: { leadId: 748 }
        })

        if (!lead) {
            console.log('Lead 748 not found')
            return
        }

        console.log(`Lead 748: Student: ${lead.studentName} | Status: ${lead.leadStatus} | AdmittedYear: ${lead.admittedYear} | InternalYear: ${lead.academicYear} | ReferrerID: ${lead.userId}`)

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
