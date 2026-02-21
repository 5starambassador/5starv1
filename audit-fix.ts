import { PrismaClient } from '@prisma/client';
import { syncUserStats } from './src/app/sync-actions';

const prisma = new PrismaClient();

async function main() {
    console.log('--- SYSTEM-WIDE RECONCILIATION AUDIT ---');

    try {
        // 1. Find users who have paid but are missing student records
        const targetUsers = await prisma.user.findMany({
            where: {
                paymentStatus: 'Success',
                childInAchariya: true,
                students: { none: {} }
            },
            select: { userId: true, mobileNumber: true, fullName: true }
        });

        console.log(`Found ${targetUsers.length} users with missing Student records.`);

        // 2. Find users who have confirmed referrals but might not have been synced
        const unSyncedAmbassadors = await prisma.user.findMany({
            where: {
                referrals: { some: { leadStatus: { in: ['Confirmed', 'Admitted'] } } },
                benefitStatus: { not: 'Active' }
            },
            select: { userId: true }
        });

        console.log(`Found ${unSyncedAmbassadors.length} ambassadors with un-synced benefits.`);

        const allTargetIds = Array.from(new Set([
            ...targetUsers.map(u => u.userId),
            ...unSyncedAmbassadors.map(u => u.userId)
        ]));

        if (allTargetIds.length === 0) {
            console.log('✅ All users are already in sync. No action needed.');
            return;
        }

        console.log(`Starting fix for ${allTargetIds.length} users...`);

        let fixedCount = 0;
        for (const userId of allTargetIds) {
            try {
                process.stdout.write(`Syncing user ${userId}... `);
                const res = await syncUserStats(userId);
                if (res.success) {
                    console.log('✅ FIXED');
                    fixedCount++;
                } else {
                    console.log('❌ FAILED:', res.error);
                }
            } catch (err: any) {
                console.log('❌ ERROR:', err.message);
            }
        }

        console.log('--- AUDIT COMPLETE ---');
        console.log(`Total fixed: ${fixedCount} / ${allTargetIds.length}`);

    } catch (err: any) {
        console.error('Audit Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
