const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectSanthiya() {
    console.log('--- Inspecting Visible Lead (SANTHIYA) ---');

    // Find lead for Santhiya (Student Name or Parent Name, screenshot said Santhiya is Lead Details which is Student Name usually)
    const lead = await prisma.referralLead.findFirst({
        where: {
            OR: [
                { studentName: { contains: 'Santhiya', mode: 'insensitive' } },
                { parentName: { contains: 'Santhiya', mode: 'insensitive' } }
            ]
        },
        include: { user: true, student: true }
    });

    if (lead) {
        console.log('Visible Lead Found:');
        console.log(JSON.stringify(lead, null, 2));
    } else {
        console.log('Santhiya lead NOT found in DB. Pass me the exact string from screenshot.');
    }

    console.log('\n--- Comparing with Restored Lead (Student One) ---');
    const restored = await prisma.referralLead.findFirst({
        where: { studentName: 'Student One' }
    });
    if (restored) {
        console.log(JSON.stringify(restored, null, 2));
    }
}

inspectSanthiya()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
