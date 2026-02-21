
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const mobile = '8525054519';
    const upiId = '641644599191';
    const orderId = 'ORDER_1771484447438_7101';

    console.log(`Manually activating account for mobile: ${mobile}`);

    const user = await prisma.user.findUnique({
        where: { mobileNumber: mobile }
    });

    if (!user) {
        console.error('User not found!');
        return;
    }

    console.log(`Found user: ${user.fullName} (ID: ${user.userId})`);

    // 1. Update Payment record
    const updatedPayment = await prisma.payment.update({
        where: { orderId: orderId },
        data: {
            paymentStatus: "Success",
            orderStatus: "PAID",
            transactionId: upiId,
            paidAt: new Date(),
            adminRemarks: "Manually synced by developer after verification"
        }
    });
    console.log('Payment record updated to Success.');

    // 2. Activate User
    await prisma.user.update({
        where: { userId: user.userId },
        data: {
            status: 'Active',
            paymentStatus: 'Success',
            transactionId: upiId,
            paymentAmount: 25
        }
    });

    console.log('User account activated successfully!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
