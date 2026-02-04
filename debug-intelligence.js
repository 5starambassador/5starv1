
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugIntelligence() {
    console.log('--- Debugging Admission Intelligence ---');

    const campuses = await prisma.campus.findMany({
        where: { isActive: true }
    });

    console.log(`Found ${campuses.length} active campuses.`);

    for (const c of campuses) {
        const totalLeads = await prisma.referralLead.count({ where: { campus: c.campusName } });
        const totalConfirmed = await prisma.referralLead.count({
            where: { campus: c.campusName, leadStatus: 'Confirmed' }
        });
        const conversionRate = totalLeads > 0 ? (totalConfirmed / totalLeads) : 0.1;

        const pipelineLeads = await prisma.referralLead.count({
            where: {
                campus: c.campusName,
                leadStatus: { in: ['New', 'Interested', 'Follow_up'] }
            }
        });

        const predictedYield = Math.round(pipelineLeads * conversionRate);

        console.log(`Campus: ${c.campusName}`);
        console.log(` - Total Leads: ${totalLeads}`);
        console.log(` - Total Confirmed: ${totalConfirmed}`);
        console.log(` - Conversion Rate: ${conversionRate.toFixed(4)}`);
        console.log(` - Pipeline Leads (New/Int/Foll): ${pipelineLeads}`);
        console.log(` - Predicted Yield: ${predictedYield}`);

        const confirmedLeads = await prisma.referralLead.findMany({
            where: {
                campus: c.campusName,
                leadStatus: 'Confirmed',
                confirmedDate: { not: null }
            },
            select: { createdAt: true, confirmedDate: true },
            orderBy: { confirmedDate: 'desc' },
            take: 50
        });

        console.log(` - Recent Confirmed Count: ${confirmedLeads.length}`);
        if (confirmedLeads.length > 0) {
            const v = confirmedLeads.reduce((acc, lead) => {
                const diff = new Date(lead.confirmedDate).getTime() - new Date(lead.createdAt).getTime();
                return acc + Math.max(0, diff / (1000 * 60 * 60 * 24));
            }, 0) / confirmedLeads.length;
            console.log(` - Velocity: ${v.toFixed(1)} days`);
        } else {
            console.log(` - Velocity: 0 (No recent confirmed leads with dates)`);
        }
    }

    await prisma.$disconnect();
}

debugIntelligence();
