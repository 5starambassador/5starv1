const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyRestoration() {
    console.log('--- Verifying Thirumoorthi (ID 1177) ---')
    const thiruLeads = await prisma.referralLead.findMany({
        where: { userId: 1177 }
    })
    console.log(`Found ${thiruLeads.length} leads for Thirumoorthi.`)
    if (thiruLeads.length > 0) {
        console.log('Sample Lead:', JSON.stringify(thiruLeads[0], null, 2))
    }

    console.log('\n--- Verifying Saravanan (ID 1184) ---')
    const saravananLeads = await prisma.referralLead.findMany({
        where: { userId: 1184 }
    })
    console.log(`Found ${saravananLeads.length} leads for Saravanan.`)
    if (saravananLeads.length > 0) {
        console.log('Sample Lead:', JSON.stringify(saravananLeads[0], null, 2))
    }
}

verifyRestoration().catch(console.error).finally(() => prisma.$disconnect())
