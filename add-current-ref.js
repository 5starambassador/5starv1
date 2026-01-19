const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCurrentReferral() {
    console.log('--- Adding Current Year Referral for Thirumoorthi R ---');
    const searchTerm = 'Thirumoorthi';
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: searchTerm, mode: 'insensitive' } }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }

    await prisma.referralLead.create({
        data: {
            userId: user.userId,
            parentName: `Current Year Parent Fix`,
            parentMobile: `9999999999`,
            studentName: `Current Student Fix`,
            gradeInterested: 'Grade 1',
            leadStatus: 'Confirmed',
            admittedYear: '2025-2026',
            createdAt: new Date(),
            annualFee: 60000
        }
    });

    console.log(`Created Current Year Referral for User ${user.userId}`);
}

addCurrentReferral()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
