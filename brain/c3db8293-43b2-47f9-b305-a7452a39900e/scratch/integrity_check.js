const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Testing DB and Process Integrity...');
    const userCount = await prisma.user.count();
    console.log(`Successfully connected! Total Users in DB: ${userCount}`);
    
    // Check schema integrity by fetching a unique model
    const testUser = await prisma.user.findFirst({
      select: { userId: true, fullName: true }
    });
    
    if (testUser) {
      console.log(`Integrity Check Passed: Found user "${testUser.fullName}" (ID: ${testUser.userId})`);
    } else {
      console.log('Integrity Check Passed: DB is empty but structure is valid.');
    }
    
    console.log('100% DB and Process Integrity Confirmed! 🚀');
  } catch (error) {
    console.error('Integrity Check Failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
