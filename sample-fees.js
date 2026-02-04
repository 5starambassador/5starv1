
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function sampleFees() {
    try {
        const fees = await prisma.feeStructure.findMany({
            take: 20
        })
        console.log(JSON.stringify(fees, null, 2))
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

sampleFees()
