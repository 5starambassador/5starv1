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
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });

        if (users.length === 0) {
            console.log("User not found");
            return;
        }

        const user = users[0];
        console.log(`User: ${user.fullName} (${user.userId})`);
        console.log(`Role: ${user.role}`);
        console.log(`isFiveStarMember: ${user.isFiveStarMember}`);

        console.log("\nRecent Referrals:");
        user.referrals.forEach(r => {
            console.log(`- Lead ID: ${r.leadId}`);
            console.log(`  Student: ${r.studentName}`);
            console.log(`  Status: ${r.leadStatus}`);
            console.log(`  Admitted Year: ${r.admittedYear}`);
            console.log(`  Student Academic Year: ${r.student?.academicYear}`);
            console.log(`  Created At: ${r.createdAt}`);
            console.log(`  Campus ID: ${r.campusId}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser('Thirumoorthi');
