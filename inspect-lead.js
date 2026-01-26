const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function oneLead() {
    const lead = await prisma.referralLead.findFirst()
    console.log('THE_LEAD_START')
    console.log(JSON.stringify(lead, null, 2))
    console.log('THE_LEAD_END')
}

oneLead().catch(console.error).finally(() => prisma.$disconnect())
