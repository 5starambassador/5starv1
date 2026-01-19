const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function validateChildInAchariyaData() {
    console.log('=== Data Validation: childInAchariya by Role ===\n');

    const results = {
        invalidParents: [],
        invalidAlumni: [],
        invalidOthers: [],
        validStaff: { withChild: 0, withoutChild: 0 },
        summary: {}
    };

    // Check Parents (should always have childInAchariya = true)
    const invalidParents = await prisma.user.findMany({
        where: {
            role: 'Parent',
            childInAchariya: false
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            childInAchariya: true
        }
    });

    // Check Alumni (should always have childInAchariya = false)
    const invalidAlumni = await prisma.user.findMany({
        where: {
            role: 'Alumni',
            childInAchariya: true
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            childInAchariya: true
        }
    });

    // Check Others (should always have childInAchariya = false)
    const invalidOthers = await prisma.user.findMany({
        where: {
            role: 'Others',
            childInAchariya: true
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            childInAchariya: true
        }
    });

    // Count Staff (both values are valid)
    const staffWithChild = await prisma.user.count({
        where: { role: 'Staff', childInAchariya: true }
    });
    const staffWithoutChild = await prisma.user.count({
        where: { role: 'Staff', childInAchariya: false }
    });

    // Build results
    results.invalidParents = invalidParents;
    results.invalidAlumni = invalidAlumni;
    results.invalidOthers = invalidOthers;
    results.validStaff = { withChild: staffWithChild, withoutChild: staffWithoutChild };

    // Console output
    console.log('🔍 INVALID DATA FOUND:\n');

    console.log(`❌ Parents with childInAchariya=false: ${invalidParents.length}`);
    if (invalidParents.length > 0) {
        invalidParents.forEach(u => {
            console.log(`   - ${u.fullName} (ID: ${u.userId})`);
        });
    }

    console.log(`\n❌ Alumni with childInAchariya=true: ${invalidAlumni.length}`);
    if (invalidAlumni.length > 0) {
        invalidAlumni.forEach(u => {
            console.log(`   - ${u.fullName} (ID: ${u.userId})`);
        });
    }

    console.log(`\n❌ Others with childInAchariya=true: ${invalidOthers.length}`);
    if (invalidOthers.length > 0) {
        invalidOthers.forEach(u => {
            console.log(`   - ${u.fullName} (ID: ${u.userId})`);
        });
    }

    console.log('\n\n✅ VALID DATA:\n');
    console.log(`Staff with child: ${staffWithChild}`);
    console.log(`Staff without child: ${staffWithoutChild}`);

    // Summary
    const totalInvalid = invalidParents.length + invalidAlumni.length + invalidOthers.length;
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total Invalid Records: ${totalInvalid}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Save to file
    fs.writeFileSync('data-validation-report.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Full report saved to: data-validation-report.json');
}

validateChildInAchariyaData()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
