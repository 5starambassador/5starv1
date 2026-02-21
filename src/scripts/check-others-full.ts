import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const othersCount = await prisma.user.count({ where: { role: 'Others' } })
    const alumniCount = await prisma.user.count({ where: { role: 'Alumni' } })

    console.log(`System counts: Others=${othersCount}, Alumni=${alumniCount}`)

    const usersWithReferrals = await prisma.user.findMany({
        where: {
            role: { in: ['Others', 'Alumni'] },
            referrals: { some: {} }
        },
        select: {
            fullName: true,
            role: true,
            childInAchariya: true,
            confirmedReferralCount: true,
            _count: {
                select: { referrals: true }
            }
        }
    })

    console.log(`Users (Others/Alumni) who HAVE at least 1 referral: ${usersWithReferrals.length}`)
    usersWithReferrals.forEach(u => {
        console.log(`- ${u.fullName} (${u.role}): ${u._count.referrals} total leads, ${u.confirmedReferralCount} confirmed field, childInAchariya=${u.childInAchariya}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
