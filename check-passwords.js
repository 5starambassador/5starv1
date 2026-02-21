const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const total = await prisma.user.count();
    const withPassword = await prisma.user.count({ where: { NOT: { password: null } } });
    const withoutPassword = await prisma.user.count({ where: { password: null } });

    console.log('--- Password Diagnostic ---');
    console.log(`Total Users: ${total}`);
    console.log(`With Password: ${withPassword}`);
    console.log(`Without Password: ${withoutPassword}`);

    const sampleWithPassword = await prisma.user.findMany({
        where: { NOT: { password: null } },
        take: 5,
        select: { mobileNumber: true, role: true, createdAt: true }
    });

    console.log('--- Sample With Passwords ---');
    console.log(JSON.stringify(sampleWithPassword, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
