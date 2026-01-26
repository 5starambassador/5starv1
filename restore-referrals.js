const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function restoreReferrals() {
    console.log('--- Starting Referral Restoration ---');

    // 1. Restore Thirumoorthi's Referrals (from JSON)
    console.log('\n--- Restoring Thirumoorthi (ID 1177) ---');
    try {
        const jsonPath = path.join(__dirname, 'thirumoorthi_analysis.json');
        if (fs.existsSync(jsonPath)) {
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { userId: 1177 },
                        { fullName: { contains: 'Thirumoorthi', mode: 'insensitive' } }
                    ]
                }
            });

            if (user) {
                console.log(`Found User: ${user.fullName} (ID: ${user.userId})`);

                for (const ref of data.referrals) {
                    // Check if lead exists
                    const existing = await prisma.referralLead.findFirst({
                        where: {
                            userId: user.userId,
                            studentName: ref.studentName
                        }
                    });

                    if (!existing) {
                        await prisma.referralLead.create({
                            data: {
                                userId: user.userId,
                                parentName: ref.studentName + " Parent", // Placeholder if missing
                                parentMobile: "0000000000", // Placeholder
                                studentName: ref.studentName,
                                leadStatus: ref.status,
                                admittedYear: ref.admittedYear,
                                createdAt: new Date(ref.createdAt),
                                annualFee: ref.actualFee,
                                campus: "ASM - KARAIKAL", // Inferred from screenshot/context or default
                                confirmedDate: ref.status === 'Confirmed' ? new Date(ref.createdAt) : null
                            }
                        });
                        console.log(`Created lead: ${ref.studentName}`);
                    } else {
                        console.log(`Lead already exists: ${ref.studentName}`);
                    }
                }
            } else {
                console.log('Thirumoorthi not found in DB');
            }
        }
    } catch (e) {
        console.error('Error processing Thirumoorthi JSON:', e.message);
    }

    // 2. Restore Saravanan's Referrals (from CSV)
    console.log('\n--- Restoring Saravanan (Mobile 9944535946) ---');
    try {
        const csvPath = path.join(__dirname, 'test_referral_import.csv');
        if (fs.existsSync(csvPath)) {
            const content = fs.readFileSync(csvPath, 'utf8');
            const lines = content.split('\n');
            const headers = lines[0].split(',');

            // Find Saravanan row (Line 2 based on previous view)
            // parentName,parentMobile,grade,section,campusName,ambassadorMobile,ambassadorName,admissionNumber,studentName,academicYear,status

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const cols = line.split(',');
                if (cols.length < 5) continue;

                const ambassadorMobile = cols[5]; // Index 5 is ambassadorMobile
                const studentName = cols[8];
                const status = cols[10];

                if (ambassadorMobile === '9944535946') {
                    const user = await prisma.user.findUnique({
                        where: { mobileNumber: ambassadorMobile }
                    });

                    if (user) {
                        console.log(`Found User: ${user.fullName} (ID: ${user.userId})`);

                        const existing = await prisma.referralLead.findFirst({
                            where: { userId: user.userId, studentName: studentName }
                        });

                        if (!existing) {
                            await prisma.referralLead.create({
                                data: {
                                    userId: user.userId,
                                    parentName: cols[0],
                                    parentMobile: cols[1],
                                    gradeInterested: cols[2],
                                    campus: cols[4],
                                    studentName: studentName,
                                    admissionNumber: cols[7],
                                    admittedYear: cols[9],
                                    leadStatus: status,
                                    confirmedDate: status === 'Confirmed' ? new Date() : null,
                                    annualFee: 60000 // Default from context
                                }
                            });
                            console.log(`Created lead: ${studentName}`);
                        } else {
                            console.log(`Lead already exists: ${studentName}`);
                        }
                    } else {
                        console.log(`Ambassador with mobile ${ambassadorMobile} not found`);
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error processing CSV:', e.message);
    }

    console.log('\n--- Restoration Complete ---');
}

restoreReferrals()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
