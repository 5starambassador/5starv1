const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function checkThirumoorthi() {
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: 'Thirumoorthi', mode: 'insensitive' } }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    const refs = await prisma.referralLead.findMany({
        where: { userId: user.userId },
        include: { student: true },
        orderBy: { createdAt: 'desc' }
    });

    const activeYears = await prisma.academicYear.findMany({ where: { isActive: true } });
    const currentYear = activeYears.find(y => y.isCurrent);

    const output = {
        user: {
            name: user.fullName,
            role: user.role,
            isFiveStarMember: user.isFiveStarMember,
            studentFee: user.studentFee,
            childInAchariya: user.childInAchariya
        },
        currentYearStart: currentYear?.startDate,
        referrals: refs.map(r => ({
            id: r.leadId,
            studentName: r.studentName,
            status: r.leadStatus,
            admittedYear: r.admittedYear,
            createdAt: r.createdAt,
            createdAfterCurrentStart: new Date(r.createdAt) >= new Date(currentYear.startDate),
            studentAcademicYear: r.student?.academicYear,
            actualFee: r.student?.annualFee || r.annualFee
        }))
    };

    fs.writeFileSync('thirumoorthi_analysis.json', JSON.stringify(output, null, 2));
    console.log('Analysis saved to thirumoorthi_analysis.json');
}

checkThirumoorthi()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
