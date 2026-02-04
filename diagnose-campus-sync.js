const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function diagnose() {
    console.log('=== Diagnostic: Campus Head Data Sync ===\n')

    // 1. Check all leads for ASM - VILLIANUR
    const allLeads = await prisma.referralLead.findMany({
        where: {
            OR: [
                { campus: { contains: 'ASM', mode: 'insensitive' } },
                { campus: { contains: 'VILLIANUR', mode: 'insensitive' } }
            ]
        },
        include: {
            user: { select: { fullName: true, role: true } }
        },
        orderBy: { createdAt: 'desc' }
    })

    console.log(`Total leads for ASM/VILLIANUR campus: ${allLeads.length}\n`)

    // Group by status
    const byStatus = allLeads.reduce((acc, lead) => {
        acc[lead.leadStatus] = (acc[lead.leadStatus] || 0) + 1
        return acc
    }, {})

    console.log('Status breakdown:')
    Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`)
    })

    console.log('\n--- Recent Leads (Last 10) ---')
    allLeads.slice(0, 10).forEach(lead => {
        console.log(`${lead.studentName || lead.parentName} | ${lead.leadStatus} | Referred by: ${lead.user?.fullName} (${lead.user?.role})`)
    })

    // 2. Check campus table
    console.log('\n--- Campus Table Check ---')
    const campuses = await prisma.campus.findMany({
        where: {
            OR: [
                { campusName: { contains: 'ASM', mode: 'insensitive' } },
                { campusName: { contains: 'VILLIANUR', mode: 'insensitive' } }
            ]
        }
    })

    campuses.forEach(c => {
        console.log(`Campus ID: ${c.id} | Name: ${c.campusName}`)
    })

    // 3. Check by campusId
    if (campuses.length > 0) {
        const campusId = campuses[0].id
        console.log(`\n--- Leads by Campus ID ${campusId} ---`)
        const leadsByCampusId = await prisma.referralLead.findMany({
            where: { campusId }
        })
        console.log(`Total leads with campusId = ${campusId}: ${leadsByCampusId.length}`)
    }

    await prisma.$disconnect()
}

diagnose().catch(console.error)
