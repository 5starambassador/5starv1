const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
    try {
        console.log('--- User Table Columns ---')
        const columns = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'User'
        `
        console.log(JSON.stringify(columns, null, 2))
    } catch (err) {
        console.error('DB Error:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

debug()
