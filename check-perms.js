const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPerms() {
    const roles = ['Staff', 'Parent', 'Alumni', 'Others'];
    for (const role of roles) {
        const perms = await prisma.rolePermissions.findUnique({
            where: { role }
        });
        console.log(`Role: ${role}`);
        if (perms) {
            console.log(`- programLeadsAccess: ${perms.programLeadsAccess}`);
            console.log(`- externalProgramsAccess: ${perms.externalProgramsAccess}`);
        } else {
            console.log(`- No DB record found (using defaults)`);
        }
    }
    await prisma.$disconnect();
}

checkPerms();
