
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Checking Student Links for Krithika Leads (154, 155, 156) ---')
        const students = await prisma.student.findMany({
            where: { referralLeadId: { in: [154, 155, 156] } }
        })

        console.log(`Found ${students.length} linked students.`)
        students.forEach(s => {
            console.log(`  - Student: ${s.fullName} | LeadID: ${s.referralLeadId} | Status: ${s.status}`)
        })

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
