
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orderId = 'ORDER_1771484447438_7101';
    console.log(`Checking details for order: ${orderId}`);

    const payment = await prisma.payment.findUnique({
        where: { orderId: orderId },
        include: { user: true }
    });

    if (!payment) {
        console.log('Payment record not found!');
        return;
    }

    console.log('Payment record:', {
        id: payment.id,
        orderId: payment.orderId,
        paymentStatus: payment.paymentStatus,
        orderStatus: payment.orderStatus,
        gatewayResponse: payment.gatewayResponse,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
