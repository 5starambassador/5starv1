import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const academicYear = '2026-2027'

    console.log(`--- Multi-Year Activity Check for ${academicYear} ---`)

    // Find users who are considered "active" in 2026-2027
    const activeUsers = await prisma.user.findMany({
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
            referrals: {
                select: { admittedYear: true, leadStatus: true }
            }
        }
    })

    let totalLegacySum = 0
    let real2026Leads = 0

    activeUsers.forEach(u => {
        totalLegacySum += u.confirmedReferralCount
        const refs2026 = u.referrals.filter(r => r.admittedYear === academicYear && (r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted'))
        real2026Leads += refs2026.length

        if (u.confirmedReferralCount !== refs2026.length) {
            console.log(`MISMATCH: ${u.fullName}`)
            console.log(`  User's AcademicYear: ${u.academicYear}`)
            console.log(`  User's Total Confirmed count (Legacy): ${u.confirmedReferralCount}`)
            console.log(`  Actual Confirmed Referrals in 2026-2027 records: ${refs2026.length}`)
            console.log(`  Other Referrals:`, u.referrals.filter(r => r.admittedYear !== academicYear).map(r => r.admittedYear))
        }
    })

    console.log(`\nLegacy Sum Total: ${totalLegacySum}`)
    console.log(`Actual 2026-2027 Lead Records: ${real2026Leads}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
