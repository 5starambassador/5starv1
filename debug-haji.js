const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

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
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (users.length === 0) {
            fs.writeFileSync('debug_haji.json', JSON.stringify({ error: "User not found" }, null, 2));
            return;
        }

        const result = users.map(user => ({
            userId: user.userId,
            fullName: user.fullName,
            role: user.role,
            isFiveStarMember: user.isFiveStarMember,
            referrals: user.referrals.map(r => ({
                leadId: r.leadId,
                studentName: r.studentName,
                leadStatus: r.leadStatus,
                admittedYear: r.admittedYear,
                studentAcademicYear: r.student?.academicYear,
                createdAt: r.createdAt,
                campusId: r.campusId
            }))
        }));

        fs.writeFileSync('debug_haji.json', JSON.stringify(result, null, 2));

    } catch (e) {
        fs.writeFileSync('debug_haji.json', JSON.stringify({ error: e.message }, null, 2));
    } finally {
        await prisma.$disconnect();
    }
}

checkUser('Haji Ali');
