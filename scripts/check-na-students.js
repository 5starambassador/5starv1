const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    // Get all Parents with N/A child names but who are "verified"
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
            childName: true,
            childInAchariya: true,
            mobileNumber: true
        }
    });

    console.log(`Found ${naParents.length} verified parents with N/A child name\n`);

    let canFix = 0;
    let noErp = 0;
    let erpNotFound = 0;

    for (const user of naParents) {
        if (!user.childEprNo) {
            noErp++;
            console.log(`[NO ERP] ${user.fullName} (${user.userId}) - No ERP on record`);
            continue;
        }

        const student = await p.student.findFirst({
            where: {
                OR: [
                    { admissionNumber: user.childEprNo },
                    { parent: { mobileNumber: user.mobileNumber } }
                ]
            },
            select: { fullName: true, admissionNumber: true }
        });

        if (student) {
            canFix++;
            console.log(`[FIX AVAILABLE] ${user.fullName} (${user.userId}) - ERP ${user.childEprNo} → Student: "${student.fullName}"`);
        } else {
            erpNotFound++;
            console.log(`[NO MATCH] ${user.fullName} (${user.userId}) - ERP "${user.childEprNo}" not in Student table`);
        }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Can auto-fix (student found): ${canFix}`);
    console.log(`No ERP entered: ${noErp}`);
    console.log(`ERP not in Student table: ${erpNotFound}`);
}

check().catch(console.error).finally(() => p.$disconnect());
