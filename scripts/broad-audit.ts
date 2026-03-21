import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function audit() {
    console.log("--- DATA AUDIT ---")
    const leadCount = await prisma.referralLead.count()
    console.log("Total ReferralLeads:", leadCount)

    const confirmedCount = await prisma.referralLead.count({
        where: { leadStatus: { in: ['Confirmed', 'Admitted', 'CONFIRMED', 'ADMITTED'] as any } }
    })
    console.log("Confirmed/Admitted Count:", confirmedCount)

    const roles = await prisma.user.groupBy({
        by: ['role'],
        _count: { userId: true }
    })
    console.log("User Roles in DB:", JSON.stringify(roles, null, 2))

    const exampleLeads = await prisma.referralLead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { leadStatus: true, academicYear: true, createdAt: true }
    })
    console.log("Latest Leads Sample:", JSON.stringify(exampleLeads, null, 2))

    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    console.log("Current Year Record:", currentYear?.year)
}

audit().catch(console.error).finally(() => prisma.$disconnect())
