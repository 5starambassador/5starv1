const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixChildInAchariyaData() {
    console.log('=== Fixing childInAchariya Data ===\n');

    try {
        // Fix 1: Update all Parents to have childInAchariya = true
        const fixedParents = await prisma.user.updateMany({
            where: {
                role: 'Parent',
                childInAchariya: false
            },
            data: {
                childInAchariya: true
            }
        });

        console.log(`✅ Fixed ${fixedParents.count} Parents (childInAchariya → true)`);

        // Fix 2: Update all Alumni to have childInAchariya = false
        const fixedAlumni = await prisma.user.updateMany({
            where: {
                role: 'Alumni',
                childInAchariya: true
            },
            data: {
                childInAchariya: false
            }
        });

        console.log(`✅ Fixed ${fixedAlumni.count} Alumni (childInAchariya → false)`);

        // Fix 3: Update all Others to have childInAchariya = false
        const fixedOthers = await prisma.user.updateMany({
            where: {
                role: 'Others',
                childInAchariya: true
            },
            data: {
                childInAchariya: false
            }
        });

        console.log(`✅ Fixed ${fixedOthers.count} Others (childInAchariya → false)`);

        const totalFixed = fixedParents.count + fixedAlumni.count + fixedOthers.count;

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total Records Fixed: ${totalFixed}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n✅ All data is now consistent!');

    } catch (error) {
        console.error('❌ Error during fix:', error);
        throw error;
    }
}

fixChildInAchariyaData()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
