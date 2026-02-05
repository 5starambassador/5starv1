const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
    try {
        const lead = await prisma.programLead.findUnique({
            where: { id: 33 },
            include: { program: true }
        })
        console.log('--- Lead 33 Full Dump ---')
        console.log(JSON.stringify(lead, null, 2))
    } catch (err) {
        console.error('DB Error:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

debug()
