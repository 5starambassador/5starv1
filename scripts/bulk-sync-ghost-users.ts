import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    console.log(`[SYNC] Starting Ghost Verification Sync (Dry Run: ${isDryRun})`);

    console.log('[SYNC] Querying users with PendingVerification...');
    const allPendingUsers = await prisma.user.findMany({
        where: {
            benefitStatus: 'PendingVerification'
        }
    });

    const ghostUsers = allPendingUsers.filter(u => u.childInAchariya === true && u.status === 'Active');
    console.log(`[SYNC] Filtering complete. Found ${ghostUsers.length} active ghost users to process.`);

    let matchedCount = 0;
    let studentCreatedCount = 0;
    let failedCount = 0;
    let processedCount = 0;

    for (const user of ghostUsers) {
        processedCount++;
        if (processedCount % 10 === 0) {
            console.log(`[PROGRESS] Processed ${processedCount}/${ghostUsers.length} users...`);
        }
        try {
            if (!user.childEprNo) {
                console.warn(`[SKIP] User ${user.userId} (${user.fullName}) has no ERP ID.`);
                continue;
            }

            // 2. Search for ERP Staging Match
            const stagingMatch = await (prisma as any).erpStudentData.findUnique({
                where: { admissionNumber: user.childEprNo }
            });

            if (!stagingMatch) {
                console.log(`[NOT_FOUND] No ERP match for User ${user.userId} / ERP: ${user.childEprNo}`);
                continue;
            }

            matchedCount++;
            console.log(`[MATCH] Found match for ${user.fullName}: Student ${stagingMatch.fullName} (${stagingMatch.grade})`);

            if (isDryRun) continue;

            // 3. Resolve Campus ID
            let campusId = user.childCampusId || user.campusId || 0;
            if (!campusId) {
                const campusRecord = await prisma.campus.findFirst({
                    where: { campusName: { equals: stagingMatch.campusName, mode: 'insensitive' } }
                });
                if (campusRecord) campusId = campusRecord.id;
            }

            // 4. Resolve Fee
            let annualFee = 60000;
            const feeRule = await prisma.gradeFee.findFirst({
                where: {
                    campusId: campusId,
                    grade: { equals: stagingMatch.grade, mode: 'insensitive' },
                    academicYear: '2026-2027' // Forcing future year as per policy
                }
            });
            if (feeRule) {
                annualFee = feeRule.annualFee_otp || 60000;
            }

            // 5. ATOMIC PROMOTION
            await prisma.$transaction(async (tx) => {
                // A. Check if Student record exists to avoid duplicates
                const existingStudent = await tx.student.findUnique({
                    where: { admissionNumber: user.childEprNo }
                });

                if (!existingStudent) {
                    await tx.student.create({
                        data: {
                            fullName: stagingMatch.fullName,
                            parentId: user.userId,
                            campusId: campusId,
                            grade: stagingMatch.grade,
                            admissionNumber: user.childEprNo,
                            status: 'Active',
                            baseFee: annualFee,
                            discountPercent: user.yearFeeBenefitPercent || 0,
                            academicYear: '2026-2027'
                        }
                    });
                    studentCreatedCount++;
                }

                // B. Update User
                await tx.user.update({
                    where: { userId: user.userId },
                    data: {
                        benefitStatus: 'Active',
                        studentFee: annualFee,
                        childName: stagingMatch.fullName,
                        grade: stagingMatch.grade,
                        campusId: campusId,
                        childCampusId: campusId,
                        assignedCampus: stagingMatch.campusName
                    }
                });
            });

            console.log(`[SUCCESS] Activated User ${user.userId} (${user.fullName})`);

        } catch (error) {
            console.error(`[ERROR] Failed to process User ${user.userId}:`, error);
            failedCount++;
        }
    }

    console.log('\n--- Sync Results ---');
    console.log(`Total Processed: ${ghostUsers.length}`);
    console.log(`Matches Found:   ${matchedCount}`);
    if (!isDryRun) {
        console.log(`Activated:       ${matchedCount - failedCount}`);
        console.log(`Students Created: ${studentCreatedCount}`);
        console.log(`Failures:        ${failedCount}`);
    }
    console.log('--------------------\n');
}

main().catch(err => {
    console.error('Fatal Sync Error:', err);
    process.exit(1);
});
