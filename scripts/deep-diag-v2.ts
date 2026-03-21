import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function diag() {
    console.log("--- FINANCE DATA DIAGNOSTIC ---")
    
    const totalConfirmed = await prisma.referralLead.count({
        where: { leadStatus: { in: ['Confirmed', 'Admitted'] } }
    })
    console.log("Total Confirmed/Admitted Referrals:", totalConfirmed)

    const febMarch26 = await prisma.referralLead.count({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            createdAt: { gte: new Date('2026-02-01') }
        }
    })
    console.log("Referrals since Feb 1st 2026:", febMarch26)

    const tagged2627 = await prisma.referralLead.count({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            OR: [
                { academicYear: '2026-2027' },
                { admittedYear: '2026-2027' }
            ]
        }
    })
    console.log("Referrals explicitly tagged 2026-2027:", tagged2627)

    const usersWithRef = await prisma.user.count({
        where: {
            referrals: {
                some: { leadStatus: { in: ['Confirmed', 'Admitted'] } }
            }
        }
    })
    console.log("Total Users with Confirmed Referrals:", usersWithRef)

    // Check specific examples
    if (febMarch26 > 0) {
        const example = await prisma.referralLead.findFirst({
            where: { createdAt: { gte: new Date('2026-02-01') } },
            include: { user: true }
        })
        console.log("Example 2026 Referral User:", example?.user?.fullName, "Status:", example?.user?.status, "Role:", example?.user?.role)
    }

    const yearRecords = await prisma.academicYear.findMany()
    console.log("Academic Year configuration:", yearRecords.map(y => `${y.year}: ${y.startDate} to ${y.endDate}`))
}

diag().catch(console.error).finally(() => prisma.$disconnect())
