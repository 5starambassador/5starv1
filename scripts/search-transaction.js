
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const upiId = '641644599191';
    console.log(`Searching for transaction ID: ${upiId}`);

    const payments = await prisma.payment.findMany({
        where: {
            OR: [
                { transactionId: upiId },
                { bankReference: upiId },
                { gatewayResponse: { path: ['bank_reference'], equals: upiId } },
                { gatewayResponse: { path: ['cf_payment_id'], equals: upiId } }
            ]
        },
        include: { user: true }
    });

    console.log(`Found ${payments.length} payments with this ID.`);
    payments.forEach(p => {
        console.log(`- OrderId: ${p.orderId}, Status: ${p.paymentStatus}, User: ${p.user?.fullName} (${p.user?.mobileNumber})`);
    });

    // Search in ActivityLog too
    const logs = await prisma.activityLog.findMany({
        where: {
            description: { contains: upiId }
        }
    });
    console.log(`Found ${logs.length} logs with this ID.`);
    logs.forEach(l => {
        console.log(`[${l.createdAt}] ${l.module}: ${l.description}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
