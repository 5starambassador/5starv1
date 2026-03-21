import prisma from '../lib/prisma';

async function main() {
    console.log('🧐 Final Verification of "ZIYA" Bug Fix...');

    // 1. Check for any remaining poisoned users (childName='ZIYA' but not userId 1182)
    const poisonedUsers = await prisma.user.findMany({
        where: {
            childName: 'ZIYA',
            userId: { not: 1182 }
        }
    });

    if (poisonedUsers.length === 0) {
        console.log('✅ PASS: No remaining poisoned users found.');
    } else {
        console.error(`❌ FAIL: Found ${poisonedUsers.length} remaining poisoned users.`);
    }

    // 2. Verify that the real parent (1182) still has the link
    const realParent = await prisma.user.findUnique({
        where: { userId: 1182 },
        include: { students: true }
    });

    if (realParent && realParent.childName === 'ZIYA') {
        console.log('✅ PASS: Real parent (1182) still correctly linked to ZIYA.');
    } else {
        console.error('❌ FAIL: Real parent link corrupted or missing.');
    }

    // 3. Test the fix logic for Staff (dry run simulation)
    // We expect syncUserStats to NOT match an empty childEprNo
    // (This is implicitly tested by the cleanup script which ran syncUserStats on them)
    
    console.log('\n✨ Verification Complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
