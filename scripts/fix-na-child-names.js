const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function autoFix() {
    console.log('🚀 Auto-fixing N/A child names for verified parents...');

    const naParents = await p.user.findMany({
        where: {
            benefitStatus: 'Active',
            role: 'Parent',
            OR: [{ childName: null }, { childName: 'N/A' }, { childName: '' }]
        },
        select: {
            userId: true,
            fullName: true,
            childEprNo: true,
            mobileNumber: true
        }
    });

    let fixed = 0;
    let skipped = 0;

    for (const user of naParents) {
        let student = null;

        // Try ERP match first
        if (user.childEprNo) {
            student = await p.student.findFirst({
                where: { admissionNumber: user.childEprNo },
                include: { campus: true }
            });
        }

        // Try mobile match as fallback
        if (!student) {
            student = await p.student.findFirst({
                where: {
                    parent: { mobileNumber: user.mobileNumber },
                    status: 'Active'
                },
                include: { campus: true }
            });
        }

        if (student) {
            await p.user.update({
                where: { userId: user.userId },
                data: {
                    childName: student.fullName,
                    grade: student.grade || undefined,
                    childEprNo: student.admissionNumber || user.childEprNo,
                    assignedCampus: student.campus?.campusName || undefined,
                    childCampusId: student.campusId || undefined
                }
            });
            console.log(`  ✅ Fixed: ${user.fullName} → Child: "${student.fullName}" (ERP: ${student.admissionNumber})`);
            fixed++;
        } else {
            console.log(`  ⏭️  Skipped: ${user.fullName} — no student match found`);
            skipped++;
        }
    }

    console.log(`\n✅ COMPLETE:`);
    console.log(`  Fixed: ${fixed}`);
    console.log(`  Skipped (no data available): ${skipped}`);
}

autoFix().catch(console.error).finally(() => p.$disconnect());
