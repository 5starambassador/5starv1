const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function viewData() {
    console.log('--- OPENING DATABASE VIEW: Reviewing Referral Leads ---');

    // 1. Count
    const count = await prisma.referralLead.count();
    console.log(`Total Leads in DB: ${count}`);

    // 2. Fetch All Details
    const leads = await prisma.referralLead.findMany({
        include: { user: { select: { fullName: true } } },
        orderBy: { leadId: 'desc' }
    });

    // 3. Display as Table
    console.table(leads.map(l => ({
        ID: l.leadId,
        'Student Name': l.studentName || 'N/A',
        'Parent Name': l.parentName,
        'Referrer': l.user?.fullName,
        'Campus': l.campus,
        'Status': l.leadStatus,
        'Correctly Linked?': l.userId ? 'YES' : 'NO'
    })));

    console.log('--- END OF DATABASE VIEW ---');
}

viewData()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
