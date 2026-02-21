
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function search() {
    const id = 'ACH26-S80199'
    console.log(`--- SEARCHING FOR ${id} ---`)

    const user = await prisma.user.findFirst({
        where: { referralCode: { contains: id, mode: 'insensitive' } }
    })
    if (user) console.log('Found in User (referralCode):', JSON.stringify(user, null, 2))

    const student = await prisma.student.findFirst({
        where: {
            OR: [
                { admissionNumber: { contains: id, mode: 'insensitive' } }
            ]
        }
    })
    if (student) console.log('Found in Student (admissionNumber):', JSON.stringify(student, null, 2))

    const lead = await prisma.referralLead.findFirst({
        where: {
            OR: [
                { admissionNumber: { contains: id, mode: 'insensitive' } }
            ]
        }
    })
    if (lead) console.log('Found in ReferralLead (admissionNumber):', JSON.stringify(lead, null, 2))

    console.log('--- SEARCH COMPLETE ---')
}

search().catch(console.error).finally(() => prisma.$disconnect())
