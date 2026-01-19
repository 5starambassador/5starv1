const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugHaji() {
    console.log('--- Debugging Haji ---');
    const searchTerm = 'Haji';
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: searchTerm, mode: 'insensitive' } }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }
    console.log(`User: ${user.fullName} (ID: ${user.userId})`);
    console.log(`Role: ${user.role}, isFiveStarMember: ${user.isFiveStarMember}`);

    const refs = await prisma.referralLead.findMany({
        where: { userId: user.userId },
        include: { student: true }
    });

    console.log(`found ${refs.length} referrals`);
    refs.forEach(r => {
        console.log(`[${r.leadId}] ${r.studentName} | Status: ${r.leadStatus} | AdmittedYear: '${r.admittedYear}' | Created: ${r.createdAt.toISOString()}`);
        if (r.student) {
            console.log(`   -> Student AcademicYear: '${r.student.academicYear}'`);
        }
    });

    const activeYears = await prisma.academicYear.findMany({ where: { isActive: true } });
    console.log('Active Years in DB:', activeYears.map(y => `${y.year} (Current: ${y.isCurrent})`));
}

debugHaji()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
