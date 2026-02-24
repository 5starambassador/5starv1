import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const academicYear = '2026-2027'

    console.log(`--- Contributors to Legacy Sum for ${academicYear} ---`)

    const contributors = await prisma.user.findMany({
        where: {
            referralCode: { not: null },
            confirmedReferralCount: { gt: 0 },
            OR: [
                { academicYear: academicYear },
                { referrals: { some: { admittedYear: academicYear } } }
            ]
        },
        select: {
            fullName: true,
            academicYear: true,
            confirmedReferralCount: true,
            _count: {
                select: { referrals: true }
            }
        }
    })

    let totalSum = 0
    contributors.forEach(u => {
        totalSum += u.confirmedReferralCount
        console.log(`${u.fullName} (User Year: ${u.academicYear}) -> Count: ${u.confirmedReferralCount}, Actual Referral Records: ${u._count.referrals}`)
    })

    console.log('\nTotal Sum:', totalSum)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
