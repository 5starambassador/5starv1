import prisma from '../lib/prisma';
import { syncUserStats } from '../app/sync-actions';

async function main() {
    console.log('🚀 Starting "ZIYA" Data Cleanup...');

    // 1. Identify poisonous links
    // We know from research that the real parent of student "ZIYA" (ID 2151) is userId 1182.
    // Any other user with childName "ZIYA" is likely poisoned by the null-matching bug.
    const poisonedUsers = await prisma.user.findMany({
        where: {
            childName: 'ZIYA',
            userId: { not: 1182 }
        },
        select: {
            userId: true,
            fullName: true,
            role: true,
            mobileNumber: true
        }
    });

    console.log(`🔍 Found ${poisonedUsers.length} poisoned users.`);

    if (poisonedUsers.length === 0) {
        console.log('✅ No poisoned users found. System is clean.');
        return;
    }

    let successCount = 0;
    for (const user of poisonedUsers) {
        try {
            console.log(`🧹 Cleaning User: ${user.fullName} (${user.role}) - ID: ${user.userId}`);
            
            // RESET: Clear the poisoned child details
            await prisma.user.update({
                where: { userId: user.userId },
                data: {
                    childName: null,
                    childEprNo: null,
                    childCampusId: null,
                    childInAchariya: false,
                    benefitStatus: 'Inactive' // Reset to Inactive until fresh sync proves otherwise
                }
            });

            // RESYNC: Trigger a fresh sync with FIXED logic to find their ACTUAL child (if any)
            await syncUserStats(user.userId);
            
            successCount++;
        } catch (err: any) {
            console.error(`❌ Failed to clean user ${user.userId}:`, err.message);
        }
    }

    console.log(`\n✨ Cleanup Complete!`);
    console.log(`📊 Total Processed: ${poisonedUsers.length}`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${poisonedUsers.length - successCount}`);
}

main()
    .catch((e) => {
        console.error('Fatal cleanup error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
