
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const start = new Date('2026-02-19T11:30:00+05:30');
    const end = new Date('2026-02-19T13:30:00+05:30');

    console.log(`Searching for payments between ${start.toISOString()} and ${end.toISOString()}`);

    const payments = await prisma.payment.findMany({
        where: {
            createdAt: {
                gte: start,
                lte: end
            }
        },
        include: { user: true },
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${payments.length} payments.`);
    payments.forEach(p => {
        console.log(`[${p.createdAt.toISOString()}] OrderId: ${p.orderId}, Status: ${p.paymentStatus}, User: ${p.user?.fullName} (${p.user?.mobileNumber}), Amount: ${p.orderAmount}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
