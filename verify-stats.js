const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const totalLeads = await prisma.referralLead.count()

        // Group by Status to see where the 93 missing leads are
        const statusBreakdown = await prisma.referralLead.groupBy({
            by: ['leadStatus'],
            _count: { _all: true }
        })

        console.log('--- DB STATUS BREAKDOWN ---')
        console.log(`TOTAL LEADS: ${totalLeads}`)
        statusBreakdown.forEach(s => {
            console.log(`${s.leadStatus}: ${s._count._all}`)
        })

        // Re-verify "Action Needed" logic from code
        const pendingCodeLogic = await prisma.referralLead.count({
            where: { leadStatus: { in: ['New', 'Follow-up'] } }
        })
        console.log(`ACTION NEEDED (New + Follow-up): ${pendingCodeLogic}`)
        console.log('---------------------------')

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
