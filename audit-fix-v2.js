const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- ENHANCED DATABASE RECONCILIATION AUDIT v2 ---');

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

        console.log(`Phase 1: Fixing ${targetUsers.length} users with missing Student records.`);

        for (const user of targetUsers) {
            try {
                process.stdout.write(`Fixing User ${user.userId} (${user.fullName})... `);

                // A. Create Student
                const student = await prisma.student.create({
                    data: {
                        fullName: user.childName || (user.fullName + "'s Child"),
                        parentId: user.userId,
                        campusId: user.campusId || 102,
                        grade: user.grade || 'N/A',
                        status: 'Active',
                        academicYear: user.academicYear || '2025-2026',
                        baseFee: user.studentFee ? Number(user.studentFee) : 60000,
                        discountPercent: user.yearFeeBenefitPercent || 0
                    }
                });

                // B. Activate User
                await prisma.user.update({
                    where: { userId: user.userId },
                    data: { status: 'Active', benefitStatus: 'Active' }
                });

                // C. REFERRAL CONFIRMATION (Beneficiary Verification)
                // If someone referred this user, confirm their lead now!
                const leads = await prisma.referralLead.findMany({
                    where: {
                        parentMobile: user.mobileNumber,
                        leadStatus: { notIn: ['Confirmed', 'Admitted', 'Rejected'] }
                    }
                });

                if (leads.length > 0) {
                    for (const lead of leads) {
                        await prisma.referralLead.update({
                            where: { leadId: lead.leadId },
                            data: {
                                leadStatus: 'Confirmed',
                                confirmedDate: new Date(),
                                admissionNumber: student.admissionNumber || 'AUTO_SYNC',
                                studentName: student.fullName
                            }
                        });

                        // Also trigger a minor sync for the Ambassador who referred them
                        await prisma.user.update({
                            where: { userId: lead.userId },
                            data: {
                                benefitStatus: 'Active'
                            }
                        });
                    }
                    process.stdout.write(`[Referral Verified] `);
                }

                console.log(`✅ Fixed.`);
            } catch (e) {
                console.log(`❌ Failed: ${e.message}`);
            }
        }

        console.log('--- ENHANCED AUDIT COMPLETE ---');

    } catch (err) {
        console.error('Audit Fatal Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
