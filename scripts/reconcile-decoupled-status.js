const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reconcile() {
    console.log('🚀 Starting Decoupled Status Reconciliation (Expert Fix)...');

    // 1. RECONCILE BENEFIT STATUS
    // Rule: benefitStatus should be 'Active' ONLY if confirmedReferralCount > 0
    // This is the core fix the user wanted (Akshaya M case)
    const misalignedBeneficiaries = await prisma.user.findMany({
        where: {
            benefitStatus: 'Active',
            confirmedReferralCount: 0
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            role: true
        }
    });

    console.log(`📊 Found ${misalignedBeneficiaries.length} users with benefitStatus 'Active' but 0 referrals.`);

    for (const u of misalignedBeneficiaries) {
        console.log(`  - Fixing ${u.fullName} (${u.role}): Setting benefitStatus -> 'Inactive'`);
        await prisma.user.update({
            where: { userId: u.userId },
            data: { benefitStatus: 'Inactive' }
        });
    }

    // 2. RECONCILE ACCOUNT STATUS (The Payment Rule)
    // Rule: status should be 'Active' ONLY if they have a successful registration payment
    const activeUsers = await prisma.user.findMany({
        where: {
            status: 'Active'
        },
        include: {
            payments: {
                where: {
                    status: 'Success'
                }
            }
        }
    });

    let paymentFixes = 0;
    for (const u of activeUsers) {
        // Registration fee is >= 25. Check if they have ANY successful payment.
        const hasPayment = u.payments.length > 0;
        
        if (!hasPayment) {
            console.log(`  ⚠️  User ${u.fullName} (${u.userId}) is Active but HAS NO PAYMENT. Reverting to Pending.`);
            await prisma.user.update({
                where: { userId: u.userId },
                data: { status: 'Pending' }
            });
            paymentFixes++;
        }
    }

    // 3. FINAL VERIFICATION FOR AKSHAYA M
    const akshaya = await prisma.user.findFirst({
        where: { fullName: { contains: 'Akshaya M', mode: 'insensitive' } }
    });
    
    if (akshaya) {
        console.log(`\n🔍 VERIFICATION (Akshaya M):`);
        console.log(`- Full Name: ${akshaya.fullName}`);
        console.log(`- Account Status: ${akshaya.status} (Should be Pending if not paid)`);
        console.log(`- Benefit Status: ${akshaya.benefitStatus} (Should be Inactive if 0 referrals)`);
        console.log(`- Child Link: ${akshaya.childInAchariya ? 'Verified' : 'Not Linked'}`);
    }

    console.log(`\n✅ RECONCILIATION COMPLETE:`);
    console.log(`- Benefit Status Fixes: ${misalignedBeneficiaries.length}`);
    console.log(`- Account Status Fixes (Missing Payment): ${paymentFixes}`);
}

reconcile()
    .catch(e => {
        console.error('❌ Error during reconciliation:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
