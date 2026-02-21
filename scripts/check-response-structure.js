
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const payment = await prisma.payment.findFirst({
        where: { paymentStatus: 'Success' },
        orderBy: { updatedAt: 'desc' }
    });

    if (!payment) {
        console.log('No successful payments found.');
        return;
    }

    console.log(`OrderId: ${payment.orderId}`);
    console.log('Gateway Response Structure keys:', Object.keys(payment.gatewayResponse || {}));
    console.log('Gateway Response (Full):', JSON.stringify(payment.gatewayResponse, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
