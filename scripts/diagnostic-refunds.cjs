const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const pendingTotal = await prisma.settlement.count({
        where: { status: 'Pending' }
    });

    const pendingRefunds = await prisma.settlement.count({
        where: { status: 'Pending', amount: 25 }
    });

    const eligibleUsersRaw = await prisma.user.findMany({
        where: {
            paymentStatus: { in: ['Success', 'Completed'] },
            paymentAmount: { gt: 0 },
            bankName: { not: null, not: '' },
            accountNumber: { not: null, not: '' },
            ifscCode: { not: null, not: '' }
        },
        select: {
            userId: true,
            settlements: {
                where: { amount: 25, status: { not: 'Rejected' } }
            }
        }
    });

    const actuallyEligible = eligibleUsersRaw.filter(u => u.settlements.length === 0).length;

    console.log('--- DIAGNOSTIC DATA ---');
    console.log('Total Pending Settlements (All):', pendingTotal);
    console.log('Pending Rs.25 Refunds:', pendingRefunds);
    console.log('Users "Ready for Refund" (Paid but no settlement):', actuallyEligible);
    console.log('-----------------------');
}

check().catch(console.error).finally(() => prisma.$disconnect());
