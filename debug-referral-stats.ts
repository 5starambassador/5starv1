
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Checking ReferralLead Stats...')

    const stats = await prisma.referralLead.groupBy({
        by: ['leadStatus', 'admittedYear'],
        _count: {
            leadId: true
        }
    })

    console.log('Referral Stats:', stats)

    const users = await prisma.user.count({
        where: {
            referrals: {
                some: {
                    leadStatus: { in: ['Confirmed', 'Admitted'] },
                    admittedYear: '2026-2027'
                }
            }
        }
    })
    console.log('Users with Confirmed/Admitted referrals for 2026-2027:', users)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
