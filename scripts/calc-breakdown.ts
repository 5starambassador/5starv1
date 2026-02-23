import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const referralCode = 'ACH25-S00006';
    const user = await prisma.user.findFirst({
        where: { referralCode },
        include: {
            referrals: {
                include: {
                    student: {
                        include: {
                            campus: true
                        }
                    }
                }
            }
        }
    });

    if (!user) return console.log('User not found');

    console.log(`👤 Name: ${user.fullName}`);
    console.log(`🛡️ Role: ${user.role} | Child in Achariya: ${user.childInAchariya}`);
    console.log(`⭐ 5-Star Member: ${user.isFiveStarMember}`);

    console.log('\n--- Referral Breakdown ---');
    let totalHistoricalFee = 0;

    // Sort by year
    const sortedRefs = user.referrals.sort((a, b) => (a.admittedYear || '').localeCompare(b.admittedYear || ''));

    for (const r of sortedRefs) {
        // For historical yield, we often use the Student's actual fee if available, 
        // or the Grade-1 fee of the campus in that year.
        const fee = r.student?.annualFee || r.student?.baseFee || r.annualFee || 60000;
        const status = r.leadStatus;
        const year = r.admittedYear;
        const campus = r.campus || r.student?.campus?.campusName;

        console.log(`[${year}] ${r.studentName} | ${campus} | Status: ${status} | Fee: ₹${fee}`);

        if (status === 'Confirmed' || status === 'Admitted') {
            totalHistoricalFee += fee;
        }
    }

    console.log(`\n💵 Aggregated Historical Fee: ₹${totalHistoricalFee}`);
    console.log(`📈 3% Historical Yield: ₹${totalHistoricalFee * 0.03}`);
}

main().finally(() => prisma.$disconnect());
