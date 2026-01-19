const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setFiveStar() {
    console.log('--- Updating Thirumoorthi to 5-Star Status ---');
    const searchTerm = 'Thirumoorthi';
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: searchTerm, mode: 'insensitive' } }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }

    // Update to 5-Star and ensure count is high enough
    await prisma.user.update({
        where: { userId: user.userId },
        data: {
            isFiveStarMember: true,
            confirmedReferralCount: 6 // 5 previous + 1 current
        }
    });

    console.log(`Updated User ${user.fullName}: isFiveStarMember=true, confirmedReferralCount=6`);
}

setFiveStar()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
