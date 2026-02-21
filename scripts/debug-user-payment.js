
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`Checking all payments from today: ${today.toDateString()}`);

    const payments = await prisma.payment.findMany({
        where: {
            updatedAt: {
                gte: today
            },
            paymentStatus: { not: 'Success' }
        },
        include: {
            user: true
        },
        orderBy: { updatedAt: 'desc' }
    });

    console.log(`Found ${payments.length} NON-SUCCESSFUL payments updated today.`);
    payments.forEach(p => {
        console.log(`- OrderId: ${p.orderId}, Status: ${p.paymentStatus}, User: ${p.user?.fullName} (${p.user?.mobileNumber}), Amount: ${p.orderAmount}, UpdatedAt: ${p.updatedAt}`);
        if (p.gatewayResponse) {
            console.log(`  Gateway Response: ${JSON.stringify(p.gatewayResponse).substring(0, 100)}...`);
        }
    });

    const mobile = '8525054519';
    console.log(`\nChecking specific user with mobile: ${mobile}`);
    const user = await prisma.user.findUnique({
        where: { mobileNumber: mobile },
        include: {
            payments: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (user) {
        console.log('User found:', {
            userId: user.userId,
            fullName: user.fullName,
            mobileNumber: user.mobileNumber,
            status: user.status,
            paymentStatus: user.paymentStatus
        });
    } else {
        console.log('User not found!');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
