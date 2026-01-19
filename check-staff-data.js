const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function checkStaffData() {
    console.log('=== Staff Data Analysis ===\n');

    // Get all staff members
    const staffWithChild = await prisma.user.findMany({
        where: {
            role: 'Staff',
            childInAchariya: true
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            studentFee: true,
            isFiveStarMember: true,
            confirmedReferralCount: true
        },
        orderBy: { fullName: 'asc' }
    });

    const staffWithoutChild = await prisma.user.findMany({
        where: {
            role: 'Staff',
            childInAchariya: false
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            studentFee: true,
            isFiveStarMember: true,
            confirmedReferralCount: true
        },
        orderBy: { fullName: 'asc' }
    });

    // Check for potential issues
    const withChildNoFee = staffWithChild.filter(s => !s.studentFee || s.studentFee === 0);
    const withoutChildHasFee = staffWithoutChild.filter(s => s.studentFee && s.studentFee > 0);

    const report = {
        summary: {
            totalStaff: staffWithChild.length + staffWithoutChild.length,
            withChild: staffWithChild.length,
            withoutChild: staffWithoutChild.length,
            fiveStarWithChild: staffWithChild.filter(s => s.isFiveStarMember).length,
            fiveStarWithoutChild: staffWithoutChild.filter(s => s.isFiveStarMember).length
        },
        potentialIssues: {
            withChildButNoFee: withChildNoFee.length,
            withoutChildButHasFee: withoutChildHasFee.length
        },
        staffWithChild: staffWithChild.slice(0, 10), // First 10 for preview
        staffWithoutChild: staffWithoutChild.slice(0, 10), // First 10 for preview
        issuesFound: {
            withChildNoFee: withChildNoFee,
            withoutChildHasFee: withoutChildHasFee
        }
    };

    console.log('📊 SUMMARY:');
    console.log(`Total Staff: ${report.summary.totalStaff}`);
    console.log(`├─ With child in Achariya: ${report.summary.withChild}`);
    console.log(`│  └─ 5-Star: ${report.summary.fiveStarWithChild}`);
    console.log(`└─ Without child in Achariya: ${report.summary.withoutChild}`);
    console.log(`   └─ 5-Star: ${report.summary.fiveStarWithoutChild}`);

    console.log('\n⚠️  POTENTIAL ISSUES:');
    console.log(`Staff with child but no studentFee: ${withChildNoFee.length}`);
    if (withChildNoFee.length > 0) {
        console.log('   (Should have studentFee for fee discount calculation)');
        withChildNoFee.slice(0, 5).forEach(s => {
            console.log(`   - ${s.fullName} (ID: ${s.userId})`);
        });
        if (withChildNoFee.length > 5) {
            console.log(`   ... and ${withChildNoFee.length - 5} more`);
        }
    }

    console.log(`\nStaff without child but has studentFee: ${withoutChildHasFee.length}`);
    if (withoutChildHasFee.length > 0) {
        console.log('   (studentFee not used for cash payout recipients)');
        withoutChildHasFee.slice(0, 5).forEach(s => {
            console.log(`   - ${s.fullName} (Fee: ₹${s.studentFee})`);
        });
        if (withoutChildHasFee.length > 5) {
            console.log(`   ... and ${withoutChildHasFee.length - 5} more`);
        }
    }

    fs.writeFileSync('staff-data-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Full report saved to: staff-data-report.json');

    console.log('\n✅ Staff data check complete!');
    console.log('Note: Both true/false values are valid for Staff role.');
}

checkStaffData()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
