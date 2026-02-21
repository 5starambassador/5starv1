
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function finalRamaCheck() {
    console.log('--- FINAL RAMA SYNC DIAGNOSIS ---')

    const user = await prisma.user.findFirst({
        where: { fullName: 'G. RAMA' },
        include: {
            referrals: true
        }
    })

    if (!user) {
        console.log('User G. RAMA not found')
        return
    }

    console.log(`User: ${user.fullName} (${user.userId})`)
    console.log(`Referral Code: ${user.referralCode}`)
    console.log(`Academic Year (User Table): ${user.academicYear}`)

    for (const r of user.referrals) {
        console.log(`\nReferral ID: ${r.leadId}`)
        console.log(`  Student Name: ${r.studentName}`)
        console.log(`  Admitted Year (Lead Table): ${r.admittedYear}`)
        console.log(`  Lead Status: ${r.leadStatus}`)
    }

    console.log('\n--- DIAGNOSIS COMPLETE ---')
}

finalRamaCheck().catch(console.error).finally(() => prisma.$disconnect())
