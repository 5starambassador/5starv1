import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    console.log('[REPORT] Generating Verification Matching Report...');

    console.log('[REPORT] Querying all users with PendingVerification...');
    const allPending = await prisma.user.findMany({
        where: {
            benefitStatus: 'PendingVerification'
        }
    });

    const ghostUsers = allPending.filter(u => u.childInAchariya === true && u.status === 'Active');
    console.log(`[REPORT] Filtering complete. Found ${ghostUsers.length} users to analyze.`);

    const headers = [
        'UserID',
        'ParentName',
        'Mobile',
        'Submitted_ERP_ID',
        'ERP_Match_Name',
        'ERP_Match_Grade',
        'ERP_Match_Campus',
        'Current_Fee_In_App',
        'Proposed_Official_Fee',
        'Match_Quality'
    ];

    const reportRows: string[] = [headers.join(',')];

    for (const user of ghostUsers) {
        let matchName = 'NO_MATCH';
        let matchGrade = '';
        let matchCampus = '';
        let proposedFee = '60000';
        let matchQuality = 'None';

        if (user.childEprNo) {
            // Find in ERP Staging
            const stagingMatch = await (prisma as any).erpStudentData.findUnique({
                where: { admissionNumber: user.childEprNo }
            });

            if (stagingMatch) {
                matchName = stagingMatch.fullName;
                matchGrade = stagingMatch.grade;
                matchCampus = stagingMatch.campusName;
                matchQuality = 'Found';

                // Look up fee
                // 1. Resolve Campus ID
                let campusId = 0;
                const campusRecord = await prisma.campus.findFirst({
                    where: { campusName: { equals: stagingMatch.campusName, mode: 'insensitive' } }
                });
                if (campusRecord) campusId = campusRecord.id;

                // 2. Resolve Grade Fee
                if (campusId) {
                    const feeRule = await prisma.gradeFee.findFirst({
                        where: {
                            campusId: campusId,
                            grade: { equals: stagingMatch.grade, mode: 'insensitive' },
                            academicYear: '2026-2027'
                        }
                    });
                    if (feeRule) {
                        proposedFee = String(feeRule.annualFee_otp || 60000);
                        matchQuality = 'Found + Fee Resolved';
                    }
                }
            }
        }

        const row = [
            user.userId,
            `"${user.fullName || ''}"`,
            `"${user.mobileNumber || ''}"`,
            `"${user.childEprNo || ''}"`,
            `"${matchName}"`,
            `"${matchGrade}"`,
            `"${matchCampus}"`,
            user.studentFee || 60000,
            proposedFee,
            matchQuality
        ];

        reportRows.push(row.join(','));
    }

    fs.writeFileSync('verification_matching_report.csv', reportRows.join('\n'));
    console.log(`[REPORT] Report generated: verification_matching_report.csv`);
    console.log(`[REPORT] Success! Please review the file.`);
}

main().catch(console.error);
