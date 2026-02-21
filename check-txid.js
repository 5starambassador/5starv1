const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const total = await prisma.user.count();
    const withTx = await prisma.user.count({ where: { NOT: { transactionId: null } } });
    const withEmptyTx = await prisma.user.count({ where: { transactionId: '' } });
    const withoutTx = await prisma.user.count({
        where: {
            OR: [
                { transactionId: null },
                { transactionId: '' }
            ]
        }
    });

    console.log('--- Transaction ID Diagnostic ---');
    console.log(`Total Users: ${total}`);
    console.log(`With Transaction ID: ${withTx}`);
    console.log(`With Empty Transaction ID: ${withEmptyTx}`);
    console.log(`Without Transaction ID (Manual): ${withoutTx}`);

    // Also check if these "Without TX" users have passwords
    const withoutTxAndWithPassword = await prisma.user.count({
        where: {
            OR: [
                { transactionId: null },
                { transactionId: '' }
            ],
            NOT: { password: null }
        }
    });

    console.log(`Without TX but WITH password: ${withoutTxAndWithPassword}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
