const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
    try {
        const program = await prisma.externalProgram.findUnique({ where: { id: 2 } })
        console.log('--- Program 2 ---')
        console.log(JSON.stringify(program, null, 2))

        const lead = await prisma.programLead.findUnique({
            where: { id: 33 },
            include: { program: true }
        })
        console.log('--- Lead 33 ---')
        console.log(JSON.stringify(lead, null, 2))

    } catch (err) {
        console.error('DB Error:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

debug()
