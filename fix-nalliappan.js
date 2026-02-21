const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = 11298;
    console.log('--- STARTING MANUAL FIX FOR USER 11298 ---');

    console.log('1. Updating User table...');
    const updatedUser = await prisma.user.update({
        where: { userId },
        data: {
            status: 'Active',
            paymentStatus: 'Success',
            transactionId: '5031705319',
            paymentAmount: 25
        }
    });
    console.log('User status:', updatedUser.status);

    console.log('2. Ensuring Payment record exists...');
    const p = await prisma.payment.findFirst({ where: { userId } });
    if (p) {
        await prisma.payment.update({
            where: { id: p.id },
            data: {
                paymentStatus: 'Success',
                orderStatus: 'PAID',
                transactionId: '5031705319',
                paidAt: new Date()
            }
        });
        console.log('Payment record updated.');
    } else {
        await prisma.payment.create({
            data: {
                userId,
                orderId: 'MANUAL_FIX_' + Date.now(),
                orderAmount: 25,
                paymentStatus: 'Success',
                orderStatus: 'PAID',
                transactionId: '5031705319',
                paidAt: new Date()
            }
        });
        console.log('Payment record created.');
    }

    console.log('3. Ensuring Student record exists...');
    const s = await prisma.student.findFirst({ where: { parentId: userId } });
    if (!s) {
        await prisma.student.create({
            data: {
                fullName: updatedUser.fullName + "'s Child",
                parentId: userId,
                campusId: updatedUser.campusId || 102,
                grade: updatedUser.grade || 'N/A',
                status: 'Active',
                academicYear: updatedUser.academicYear || '2025-2026',
                baseFee: 60000,
                discountPercent: 0,
                updatedAt: new Date(),
                createdAt: new Date()
            }
        });
        console.log('Student record created.');
    } else {
        console.log('Student record already exists.');
    }

    console.log('--- FIX COMPLETE ---');
}

main()
    .catch(err => {
        console.error('ERROR DURING FIX:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
