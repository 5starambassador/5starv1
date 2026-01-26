import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('📊 Checking Table Counts...')

    const students = await prisma.student.count()
    const referrals = await prisma.referralLead.count()
    const users = await prisma.user.count()

    console.log(`Students: ${students}`)
    console.log(`ReferralLeads: ${referrals}`)
    console.log(`Users: ${users}`)

    // Check one student date if exists
    if (students > 0) {
        const first = await prisma.student.findFirst()
        console.log('First Student CreatedAt:', first?.createdAt)
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect()
    })
