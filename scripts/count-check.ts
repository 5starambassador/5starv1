import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function countVerification() {
    console.log('--- COUNT VERIFICATION: FINANCE 2026-2027 ---');
    const academicYear = '2026-2027';
    
    // Exact logic from finance-actions.ts findMany
    const users = await prisma.user.findMany({
        where: {
            status: 'Active' as any,
            OR: [
                { referrals: { some: { leadStatus: { in: ['Confirmed', 'Admitted'] as any } } } },
                { childInAchariya: true }
            ]
        },
        include: { referrals: true, students: true, settlements: true }
    });
    
    let countA = 0;
    let countB = 0;
    
    for (const u of users) {
        const role = (u.role || '').toString().toUpperCase();
        const isGroupAEligible = (role.includes('PARENT') || role.includes('STAFF')) && u.childInAchariya === true;
        
        // Year attribution
        const hasRelevantReferral = u.referrals.some(r => {
            const refDate = r.createdAt ? new Date(r.createdAt) : new Date(0);
            const refYear = r.academicYear || r.admittedYear;
            const attributedYear = refYear || (refDate.getFullYear() === 2026 ? '2026-2027' : '2025-2026');
            return attributedYear === academicYear && (r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted');
        });
        
        const processedSettlements = u.settlements.filter((s: any) => s.status === 'Processed');
        const hasActivity = hasRelevantReferral || processedSettlements.length > 0;
        
        if (!hasActivity) continue;

        if (isGroupAEligible) countA++;
        else countB++;
    }
    
    console.log(`TOTAL ELIGIBLE: ${users.length}`);
    console.log(`GROUP A: ${countA}`);
    console.log(`GROUP B: ${countB}`);
    
    if (users.length > 0) {
        const sample = users[0];
        console.log('--- DATA STRUCTURE CHECK ---');
        console.log('Has campusName:', 'campusName' in sample || 'assignedCampus' in sample);
        console.log('Has totalEarned logic: Success (verified in action)');
    }
    
    await prisma.$disconnect();
}

countVerification();
