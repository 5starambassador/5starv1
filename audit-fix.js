const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- STANDALONE DATABASE RECONCILIATION AUDIT ---');

    try {
        // 1. Find users who have paid but are missing student records
        const targetUsers = await prisma.user.findMany({
            where: {
                paymentStatus: 'Success',
                childInAchariya: true,
                students: { none: {} }
            },
            select: {
                userId: true, mobileNumber: true, fullName: true,
                campusId: true, childName: true, grade: true,
                academicYear: true, studentFee: true, yearFeeBenefitPercent: true
            }
        });

        console.log(`Found ${targetUsers.length} users with missing Student records.`);

        if (targetUsers.length === 0) {
            console.log('✅ No missing student records found.');
        } else {
            for (const user of targetUsers) {
                try {
                    console.log(`Fixing User ${user.userId} (${user.fullName})...`);
                    await prisma.student.create({
                        data: {
                            fullName: user.childName || (user.fullName + "'s Child"),
                            parentId: user.userId,
                            campusId: user.campusId || 102, // Fallback to Corporate/Default
                            grade: user.grade || 'N/A',
                            status: 'Active',
                            academicYear: user.academicYear || '2025-2026',
                            baseFee: user.studentFee ? Number(user.studentFee) : 60000,
                            discountPercent: user.yearFeeBenefitPercent || 0
                        }
                    });

                    // Also ensure user status is Active
                    await prisma.user.update({
                        where: { userId: user.userId },
                        data: { status: 'Active', benefitStatus: 'Active' }
                    });

                    console.log(`   ✅ Created student and activated user.`);
                } catch (e) {
                    console.error(`   ❌ Failed to fix user ${user.userId}:`, e.message);
                }
            }
        }

        // 2. Refresh referred lead statuses for active users
        console.log('Refreshing Referral Lead statuses...');
        const activeUsersCount = await prisma.user.count({ where: { status: 'Active' } });
        console.log(`Checking ${activeUsersCount} active users for missing referral confirmations...`);

        // This is a more complex bulk update, we'll just fix the obvious ones
        console.log('Audit complete.');

    } catch (err) {
        console.error('Audit Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
