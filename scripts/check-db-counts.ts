
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('📊 Checking Database Counts...')

    const leads = await prisma.programLead.count()
    console.log(`- Program Leads: ${leads}`)

    const referrals = await prisma.referralLead.count()
    console.log(`- Referral Leads: ${referrals}`)

    const students = await prisma.student.count({
        where: { status: 'Active' }
    })
    console.log(`- Active Students: ${students}`)

    const ambassadors = await prisma.user.count({
        where: { status: 'Active' }
    })
    console.log(`- Active Ambassadors: ${ambassadors}`)
}

main()
