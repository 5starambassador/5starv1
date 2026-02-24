import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const academicYear = '2026-2027'

    console.log(`--- Diagnostics for ${academicYear} ---`)

    // 1. ReferralLead counts
    const totalConfirmedLeads = await prisma.referralLead.count({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            admittedYear: academicYear
        }
    })

    // 2. Legacy confirmed counts (sum of confirmedReferralCount in User table for that year)
    // Logic Fix: Only use legacy fallback for 'All' views.
    const legacyConfirmedCount = (!academicYear || (academicYear as string) === 'All')
        ? (await prisma.user.aggregate({
            where: {
                referralCode: { not: null },
                OR: [
                    { academicYear: academicYear },
                    { referrals: { some: { admittedYear: academicYear } } }
                ]
            },
            _sum: { confirmedReferralCount: true }
        }))._sum.confirmedReferralCount || 0
        : 0

    // 3. Student counts for that year
    // Case A: studentSource = 'referral' (default in dash)
    const totalStudentsReferral = await prisma.student.count({
        where: {
            academicYear: academicYear,
            referralLeadId: { not: null }
        }
    })

    // Case B: studentSource = 'all'
    const totalStudentsAll = await prisma.student.count({
        where: { academicYear: academicYear }
    })

    // 4. Missing Student Records (Leads that are confirmed but have no student record)
    const missingStudentCount = await prisma.referralLead.count({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            student: { is: null },
            admittedYear: academicYear
        }
    })

    console.log('ReferralLead (Confirmed/Admitted):', totalConfirmedLeads)
    console.log('Legacy User.confirmedReferralCount sum:', legacyConfirmedCount)
    console.log('Final "Confirmed Admissions" (Max of above):', Math.max(totalConfirmedLeads, legacyConfirmedCount))
    console.log('\nStudent Table (academicYear = 2026-2027, from Referral):', totalStudentsReferral)
    console.log('Student Table (academicYear = 2026-2027, Total All):', totalStudentsAll)
    console.log('\nConfirmed Leads missing Student record:', missingStudentCount)

    // 5. Sample check - naming mismatch?
    const leadSample = await prisma.referralLead.findFirst({
        where: { admittedYear: academicYear },
        select: { admittedYear: true }
    })
    const studentSample = await prisma.student.findFirst({
        where: { academicYear: academicYear },
        select: { academicYear: true }
    })

    console.log('\nSample lead admittedYear:', leadSample?.admittedYear)
    console.log('Sample student academicYear:', studentSample?.academicYear)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
