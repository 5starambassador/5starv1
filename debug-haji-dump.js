const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function debugHajiDump() {
    const output = { user: null, referrals: [], activeYears: [] };

    const searchTerm = 'Haji';
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: searchTerm, mode: 'insensitive' } }
    });

    if (user) {
        output.user = { id: user.userId, name: user.fullName, isFiveStar: user.isFiveStarMember };

        const refs = await prisma.referralLead.findMany({
            where: { userId: user.userId },
            include: { student: true }
        });

        output.referrals = refs.map(r => ({
            id: r.leadId,
            studentName: r.studentName,
            status: r.leadStatus,
            admittedYear: r.admittedYear,
            createdAt: r.createdAt,
            studentAcademicYear: r.student?.academicYear
        }));
    }

    output.activeYears = await prisma.academicYear.findMany({ where: { isActive: true } });

    fs.writeFileSync('debug_haji_dump.json', JSON.stringify(output, null, 2));
}

debugHajiDump()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
