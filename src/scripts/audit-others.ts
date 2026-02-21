import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Diagnostic: Users with role "Others" ---')
    const othersUsers = await prisma.user.findMany({
        where: { role: 'Others' },
        include: {
            referrals: {
                where: { leadStatus: { in: ['Confirmed', 'Admitted'] } },
                select: {
                    leadId: true,
                    leadStatus: true,
                    admittedYear: true,
                    parentName: true
                }
            }
        }
    })

    console.log(`Total "Others" users: ${othersUsers.length}`)

    const withConfirmedLeads = othersUsers.filter(u => u.referrals.length > 0)
    console.log(`"Others" users with Confirmed/Admitted leads: ${withConfirmedLeads.length}`)

    withConfirmedLeads.forEach(u => {
        console.log(`User: ${u.fullName} (ID: ${u.userId})`)
        console.log(`  - Confirmed Referral Count (DB field): ${u.confirmedReferralCount}`)
        console.log(`  - Child in Achariya: ${u.childInAchariya}`)
        u.referrals.forEach(r => {
            console.log(`    * Lead: ${r.parentName}, Status: ${r.leadStatus}, Year: ${r.admittedYear}`)
        })
    })

    console.log('\n--- Checking for potential data inconsistencies ---')
    // Check for users who have confirmedReferralCount > 0 but no actual Confirmed/Admitted leads in the cycle
    const discrepantUsers = await prisma.user.findMany({
        where: {
            role: 'Others',
            confirmedReferralCount: { gt: 0 }
        },
        select: {
            fullName: true,
            confirmedReferralCount: true,
            referrals: {
                select: {
                    leadStatus: true,
                    admittedYear: true
                }
            }
        }
    })

    discrepantUsers.forEach(u => {
        const confirmedInDB = u.referrals.filter(r => ['Confirmed', 'Admitted'].includes(r.leadStatus)).length
        if (confirmedInDB !== u.confirmedReferralCount) {
            console.log(`WARN: ${u.fullName} has count discrepancy. DB Field: ${u.confirmedReferralCount}, Actual Leads: ${confirmedInDB}`)
        }
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
