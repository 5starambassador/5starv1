const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const total = await prisma.user.count();
    const active = await prisma.user.count({ where: { status: 'Active' } });
    const withEmail = await prisma.user.count({ where: { email: { not: null, not: '' } } });
    const activeWithEmail = await prisma.user.count({ where: { status: 'Active', email: { not: null, not: '' } } });

    console.log(`Total Users: ${total}`);
    console.log(`Active Users: ${active}`);
    console.log(`Users with Email: ${withEmail}`);
    console.log(`Active Users with Email: ${activeWithEmail}`);

    const campusCounts = await prisma.user.groupBy({
        by: ['assignedCampus'],
        _count: { userId: true },
        where: { status: 'Active', email: { not: null, not: '' } }
    });
    console.log('--- Campus Counts (Active + Email) ---');
    campusCounts.sort((a, b) => a._count.userId - b._count.userId).forEach(c => {
        console.log(`${c.assignedCampus || 'Global'}: ${c._count.userId}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
