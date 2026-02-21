import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Diagnostic: Group B (childInAchariya=false) with referrals ---')
    const groupBUsers = await prisma.user.findMany({
        where: { childInAchariya: false },
        include: {
            referrals: {
                select: {
                    leadStatus: true,
                    admittedYear: true,
                    parentName: true
                }
            }
        }
    })

    const withReferrals = groupBUsers.filter(u => u.referrals.length > 0)
    console.log(`Found ${withReferrals.length} Group B users with referrals.`)

    withReferrals.forEach(u => {
        console.log(`User: ${u.fullName} (ID: ${u.userId})`)
        u.referrals.forEach(r => {
            console.log(`  - Status: ${r.leadStatus}, Year: ${r.admittedYear}`)
        })
    })

    console.log('\n--- Checking for any 2026-2027 Confirmed/Admitted leads ---')
    const leads = await prisma.referralLead.findMany({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            admittedYear: '2026-2027'
        },
        include: {
            user: {
                select: {
                    fullName: true,
                    childInAchariya: true
                }
            }
        }
    })

    console.log(`Total 2026-2027 Confirmed/Admitted leads: ${leads.length}`)
    leads.forEach(l => {
        console.log(`Lead for ${l.parentName} by ${l.user.fullName} (Group ${l.user.childInAchariya ? 'A' : 'B'})`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
