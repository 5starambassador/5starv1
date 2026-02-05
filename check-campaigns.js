const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const campaigns = await prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' }
    });
    console.log(`Total Campaigns: ${campaigns.length}`);
    campaigns.forEach(c => {
        console.log(`- [${c.id}] ${c.name}: Audience=${JSON.stringify(c.targetAudience)}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
