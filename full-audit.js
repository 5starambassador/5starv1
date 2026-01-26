const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fullAudit() {
    console.log('--- Full Table Audit ---')
    const tables = [
        'User', 'ReferralLead', 'Student', 'Campus', 'AcademicYear', 'GradeFee', 'BenefitSlab', 'OtpVerification'
    ]

    for (const table of tables) {
        try {
            const count = await prisma[table.charAt(0).toLowerCase() + table.slice(1)].count()
            console.log(`${table}: ${count} records`)
        } catch (e) {
            console.log(`${table}: Error counting (${e.message})`)
        }
    }

    console.log('--- Users with Leads ---')
    const usersWithLeads = await prisma.referralLead.groupBy({
        by: ['userId'],
        _count: { userId: true }
    })
    console.log('UserIDs with leads:', JSON.stringify(usersWithLeads, null, 2))

    if (usersWithLeads.length > 0) {
        const ids = usersWithLeads.map(ul => ul.userId)
        const userDetails = await prisma.user.findMany({
            where: { userId: { in: ids } },
            select: { userId: true, fullName: true, confirmedReferralCount: true }
        })
        console.log('User details for leads:', JSON.stringify(userDetails, null, 2))
    }
}

fullAudit().catch(console.error).finally(() => prisma.$disconnect())
