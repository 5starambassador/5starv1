const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function listTables() {
    const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `
    console.log('TABLES_START')
    console.log(JSON.stringify(tables, null, 2))
    console.log('TABLES_END')
}

listTables().catch(console.error).finally(() => prisma.$disconnect())
