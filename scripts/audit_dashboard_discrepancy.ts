
import prisma from './src/lib/prisma';

async function auditDiscrepancy() {
    console.log('--- Dashboard Discrepancy Audit ---');
    
    // 1. Total Confirmed from referralLead records
    const leadCount = await prisma.referralLead.count({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            admittedYear: '2026-2027'
        }
    });
    
    // 2. Total Confirmed from User.confirmedReferralCount
    const userLegacySum = await prisma.user.aggregate({
        where: {
            OR: [
                { academicYear: '2026-2027' },
                { referrals: { some: { admittedYear: '2026-2027' } } }
            ]
        },
        _sum: { confirmedReferralCount: true }
    });
    
    console.log(`Confirmed Leads (Detailed Records): ${leadCount}`);
    console.log(`Confirmed Count (User Profiles): ${userLegacySum._sum.confirmedReferralCount || 0}`);
    
    // 3. Find specific users with discrepancies
    const users = await prisma.user.findMany({
        where: {
            confirmedReferralCount: { gt: 0 }
        },
        select: {
            userId: true,
            fullName: true,
            confirmedReferralCount: true,
            _count: {
                select: {
                    referrals: {
                        where: { leadStatus: { in: ['Confirmed', 'Admitted'] } }
                    }
                }
            }
        }
    });
    
    const discrepancies = users.filter(u => u.confirmedReferralCount !== u._count.referrals);
    
    if (discrepancies.length > 0) {
        console.log('\nFound users with mismatching counts:');
        discrepancies.forEach(u => {
            if (u.confirmedReferralCount !== u._count.referrals) {
                console.log(`- ${u.fullName} (ID: ${u.userId}): Profile says ${u.confirmedReferralCount}, but has ${u._count.referrals} lead records.`);
            }
        });
    } else {
        console.log('\nNo per-user discrepancies found in current filtered set.');
    }
}

auditDiscrepancy()
    .catch(console.error)
    .finally(() => process.exit());
