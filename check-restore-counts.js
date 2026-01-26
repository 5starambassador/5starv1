const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCounts() {
    const tCount = await prisma.referralLead.count({ where: { userId: 1177 } })
    const sCount = await prisma.referralLead.count({ where: { userId: 1184 } })
    console.log(`Thirumoorthi: ${tCount}`)
    console.log(`Saravanan: ${sCount}`)
}

checkCounts().catch(console.error).finally(() => prisma.$disconnect())
