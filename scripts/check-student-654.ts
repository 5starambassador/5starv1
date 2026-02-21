
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStudent() {
    console.log('--- CHECKING STUDENT FOR LEAD 654 ---')

    const lead = await prisma.referralLead.findUnique({
        where: { leadId: 654 }
    })
    console.log('Lead Admitted Year:', lead?.admittedYear)

    const student = await prisma.student.findUnique({
        where: { referralLeadId: 654 }
    })
    console.log('Linked Student:', JSON.stringify(student, null, 2))

    console.log('--- CHECK COMPLETE ---')
}

checkStudent().catch(console.error).finally(() => prisma.$disconnect())
