import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Safety Audit Started ---');
  try {
    // This is a safe, read-only raw query to list columns in PostgreSQL
    const columns: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User'
      ORDER BY column_name;
    `);

    console.log('Current User Table Columns:');
    const columnNames = columns.map(c => c.column_name);
    columnNames.forEach(name => console.log(`- ${name}`));

    const criticalMissing = ['bankName', 'accountNumber', 'ifscCode'].filter(
      col => !columnNames.includes(col)
    );

    if (criticalMissing.length > 0) {
      console.log('\nResult: The following columns are MISSING:', criticalMissing);
      console.log('Safety Note: Adding these is an "Additive Sync" and will NOT touch existing data.');
    } else {
      console.log('\nResult: All columns are present. The error may be elsewhere.');
    }
  } catch (error) {
    console.error('Audit Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
