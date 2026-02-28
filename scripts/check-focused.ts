
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const campusName = "ASM-TRICHY"
        console.log(`--- Campus: ${campusName} ---`)
        const campus = await prisma.campus.findFirst({
            where: { campusName: { contains: 'TRICHY', mode: 'insensitive' } }
        })

        if (campus) {
            console.log(`Found Campus: ${campus.campusName} (ID: ${campus.id})`)
            const fees = await prisma.gradeFee.findMany({
                where: { campusId: campus.id }
            })
            console.log('Fees found:', fees)
        } else {
            console.log('Campus not found')
        }

        const testLeadId = 914
        console.log(`\n--- Lead ID: ${testLeadId} Detail ---`)
        const lead = await prisma.referralLead.findUnique({
            where: { leadId: testLeadId },
            include: { student: true, user: true }
        })
        console.log(JSON.stringify(lead, null, 2))

    } catch (err) {
        console.error('Script Error:', err)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
