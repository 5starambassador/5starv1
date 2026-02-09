const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function analyzeUsers() {
    const output = [];

    try {
        //1. Count users by role
        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            _count: { userId: true }
        });

        output.push('\n=== TOTAL USERS BY ROLE ===');
        usersByRole.forEach(r => {
            output.push(`${r.role}: ${r._count.userId} users`);
        });

        const totalUsers = usersByRole.reduce((sum, r) => sum + r._count.userId, 0);
        output.push(`TOTAL: ${totalUsers} users\n`);

        // 2. Campus assignment status
        const emptyCampusId = await prisma.user.count({
            where: { campusId: null }
        });

        const emptyAssignedCampus = await prisma.user.count({
            where: { assignedCampus: null }
        });

        const bothEmpty = await prisma.user.count({
            where: {
                campusId: null,
                assignedCampus: null
            }
        });

        output.push('=== CAMPUS ASSIGNMENT STATUS ===');
        output.push(`Users with NULL campusId: ${emptyCampusId}`);
        output.push(`Users with NULL assignedCampus: ${emptyAssignedCampus}`);
        output.push(`Users with BOTH empty: ${bothEmpty}\n`);

        // 3. Break down by role
        output.push('=== EMPTY CAMPUS BY ROLE ===');
        for (const roleData of usersByRole) {
            const role = roleData.role;
            const emptyForRole = await prisma.user.count({
                where: {
                    role: role,
                    campusId: null,
                    assignedCampus: null
                }
            });
            const percent = ((emptyForRole / roleData._count.userId) * 100).toFixed(1);
            output.push(`${role}: ${emptyForRole}/${roleData._count.userId} (${percent}%)`);
        }

        // 4. Sample users per role with empty campus
        output.push('\n=== SAMPLE USERS WITH EMPTY CAMPUS (10 per role) ===');
        for (const roleData of usersByRole) {
            const role = roleData.role;
            output.push(`\n--- ${role} ---`);

            const samples = await prisma.user.findMany({
                where: {
                    role: role,
                    campusId: null,
                    assignedCampus: null
                },
                select: {
                    userId: true,
                    fullName: true,
                    status: true,
                    createdAt: true,
                    childInAchariya: true,
                    role: true
                },
                take: 10,
                orderBy: { createdAt: 'desc' }
            });

            if (samples.length === 0) {
                output.push('  (All have campus assigned)');
            } else {
                samples.forEach(u => {
                    output.push(`  ID:${u.userId} | ${u.fullName} | Status:${u.status} | ChildInAchariya:${u.childInAchariya} | ${u.createdAt.toISOString().split('T')[0]}`);
                });
            }
        }

        // 5. Check registration logic
        output.push('\n\n=== REGISTRATION LOGIC CHECK ===');
        output.push('Checking recent registrations (last 30 days) with empty campus...');

        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 30);

        const recentEmpty = await prisma.user.count({
            where: {
                createdAt: { gte: recentDate },
                campusId: null,
                assignedCampus: null
            }
        });

        output.push(`Recent registrations (last 30 days) with empty campus: ${recentEmpty}`);

    } catch (error) {
        output.push(`\nERROR: ${error.message}`);
    } finally {
        await prisma.$disconnect();
    }

    const report = output.join('\n');
    console.log(report);
    fs.writeFileSync('campus-analysis-report.txt', report);
    console.log('\n\n✅ Report saved to: campus-analysis-report.txt');
}

analyzeUsers();
