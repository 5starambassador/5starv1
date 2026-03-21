import prisma from '../lib/prisma';

async function main() {
    console.log('📋 Generating List of Cleaned Users...');

    // We look for Staff/Users updated in the last 1 hour who have childName as null
    // and were recently processed by our sync/cleanup actions.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const users = await prisma.user.findMany({
        where: {
            updatedAt: { gte: oneHourAgo },
            childName: null,
            role: { in: ['Staff', 'Others', 'Alumni'] } // Others and Alumni might also have been caught if they had null ERP
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            role: true,
            updatedAt: true
        },
        orderBy: { updatedAt: 'desc' }
    });

    console.log(`\n### Cleaned Users Report (${users.length} records)\n`);
    console.log('| User ID | Full Name | Mobile Number | Role | Updated At |');
    console.log('|---------|-----------|---------------|------|------------|');
    
    users.forEach(u => {
        console.log(`| ${u.userId} | ${u.fullName} | ${u.mobileNumber} | ${u.role} | ${u.updatedAt.toISOString()} |`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
