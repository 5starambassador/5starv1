import prisma from './src/lib/prisma';
import { syncUserStats } from './src/app/sync-actions';

async function main() {
    const userId = 11298;
    console.log('--- Manual Sync Verification ---');
    console.log('User ID:', userId);

    // 1. Manually set to Active/Success (Simulating what the webhook would have done)
    console.log('Activating User in DB...');
    await prisma.user.update({
        where: { userId },
        data: {
            status: 'Active' as any,
            paymentStatus: 'Success'
        }
    });

    console.log('Activating Payment in DB...');
    await prisma.payment.updateMany({
        where: { userId, paymentStatus: 'Pending' },
        data: {
            paymentStatus: 'Success',
            orderStatus: 'PAID'
        }
    });

    // 2. Run the new Sync Logic
    console.log('Running syncUserStats...');
    const result = await syncUserStats(userId);
    console.log('Sync Result:', JSON.stringify(result, null, 2));

    // 3. Verify Student Record
    const student = await prisma.student.findFirst({
        where: { parentId: userId }
    });

    if (student) {
        console.log('✅ SUCCESS: Student record created successfully.');
        console.log('Student Info:', {
            name: student.fullName,
            grade: student.grade,
            campusId: student.campusId,
            status: student.status
        });
    } else {
        console.log('❌ FAILED: Student record not created.');
    }
}

main()
    .catch(err => {
        console.error('Script Error:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
