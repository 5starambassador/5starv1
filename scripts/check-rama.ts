
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkRama() {
    console.log('--- DIAGNOSING RAMA DATA ---')

    const leads = await prisma.referralLead.findMany({
        where: {
            studentName: { contains: 'RAMA', mode: 'insensitive' }
        },
        include: {
            user: true
        }
    })

    console.log('Referral Leads found:', JSON.stringify(leads, null, 2))

    for (const lead of leads) {
        const student = await prisma.student.findUnique({
            where: { referralLeadId: lead.leadId }
        })
        console.log(`Linked Student for Lead ${lead.leadId}:`, JSON.stringify(student, null, 2))
    }

    console.log('--- DIAGNOSIS COMPLETE ---')
}

checkRama().catch(console.error).finally(() => prisma.$disconnect())
