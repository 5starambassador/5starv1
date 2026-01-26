const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function allSchemas() {
    const tables = await prisma.$queryRaw`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name;
  `
    console.log('SCHEMAS_START')
    console.log(JSON.stringify(tables, null, 2))
    console.log('SCHEMAS_END')
}

allSchemas().catch(console.error).finally(() => prisma.$disconnect())
