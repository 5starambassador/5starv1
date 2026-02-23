import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const referralCode = 'ACH25-S00006';
    const user: any = await prisma.user.findFirst({ where: { referralCode } });
    const referrals = await prisma.referralLead.findMany({
        where: { userId: user.userId },
        include: { student: true }
    });

    const activeYears = await prisma.academicYear.findMany({ where: { isActive: true } });
    const currentYearRecord = activeYears.find(y => y.isCurrent) || activeYears[0];
    const prevYear = '2025-2026'; // Server logic usually picks this
    const currentYear = currentYearRecord.year;

    const filterReferralsByYear = (refs: any[], yearRecord: any, CURRENT: string, PREV: string) => {
        if (!yearRecord) return refs;
        if (yearRecord.isCurrent) {
            return refs.filter((r: any) => {
                const s = r.student;
                if (s?.academicYear) {
                    if (s.academicYear === CURRENT || s.academicYear === '2026-2027') return true;
                }
                if (r.admittedYear) {
                    if (r.admittedYear === PREV) return false;
                    if (r.admittedYear === CURRENT || r.admittedYear === '2026-2027') return true;
                }
                if (s?.academicYear) {
                    if (s.academicYear === PREV) return false;
                }
                const createdDate = new Date(r.createdAt);
                const currentYearStart = new Date(yearRecord.startDate);
                return createdDate >= currentYearStart;
            });
        }
        return []; // simplified
    };

    const currentConfirmedIds = filterReferralsByYear(referrals, currentYearRecord, currentYear, prevYear)
        .filter((r: any) => r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted')
        .map((r: any) => r.leadId);

    const historicalReferrals = referrals
        .filter((r: any) => r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted')
        .filter((r: any) => !currentConfirmedIds.includes(r.leadId));

    console.log(`User: ${user.fullName}`);
    console.log(`Current Confirmed IDs: ${JSON.stringify(currentConfirmedIds)}`);
    console.log(`Historical Referrals Count: ${historicalReferrals.length}`);
    historicalReferrals.forEach(r => {
        console.log(`- ${r.studentName} | ${r.admittedYear} | Fee: ${r.student?.annualFee || r.annualFee}`);
    });

    const totalHistoricalFee = historicalReferrals.reduce((sum, r) => sum + (r.student?.annualFee || r.annualFee || 0), 0);
    console.log(`Total Historical Fee: ₹${totalHistoricalFee}`);
    console.log(`3% Bonus: ₹${Math.floor(totalHistoricalFee * 0.03)}`);
}

main().finally(() => prisma.$disconnect());
