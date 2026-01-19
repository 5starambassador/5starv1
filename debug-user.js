const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser(name) {
    try {
        const users = await prisma.user.findMany({
            where: {
                fullName: { contains: name, mode: 'insensitive' }
            },
            include: {
                referrals: {
                    include: {
                        student: true
                    }
                }
            }
        });

        console.log(JSON.stringify(users, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser('Thirumoorthi');
