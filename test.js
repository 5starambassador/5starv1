const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campuses = await prisma.campus.findMany({
    where: { campusName: { in: ['AASC', 'ACET', 'ACCHM'] } }
  });
  console.log("Campuses:", campuses);
  
  const gradeFees = await prisma.gradeFee.findMany({
    where: { campusId: { in: campuses.map(c => c.id) } }
  });
  console.log("GradeFees:", gradeFees);
}

main().finally(() => prisma.$disconnect());
