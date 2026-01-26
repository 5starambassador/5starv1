const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mocking permission service
const scopeFilter = {}; // Super Admin sees all

async function debugFetch() {
    console.log('--- Debugging getAllReferrals Simulation ---');

    try {
        const where = { ...scopeFilter };
        // Simulate no filters first

        console.log('Querying Prisma...');
        const referrals = await prisma.referralLead.findMany({
            where,
            include: { user: true, student: true },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        console.log(`Success! Fetched ${referrals.length} referrals.`);

        // Log the restored ones specifically
        const restored = referrals.filter(r => r.userId === 1177 || r.userId === 1184);
        console.log(`Found ${restored.length} restored referrals in the fetch result.`);

        restored.forEach(r => {
            console.log(`- Lead ${r.leadId}: User ${r.user?.fullName}, Campus '${r.campus}', Status '${r.leadStatus}'`);
        });

        // Check for serialization issues (circular refs or weird types)
        // Next.js serializes via JSON.stringify essentially.
        try {
            JSON.stringify(referrals);
            console.log('Serialization check passed.');
        } catch (e) {
            console.error('Serialization FAILED:', e.message);
        }

    } catch (error) {
        console.error('Fetch FAILED:', error);
    }
}

debugFetch()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
