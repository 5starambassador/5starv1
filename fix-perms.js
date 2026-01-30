const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPerms() {
    const roles = ['Staff', 'Parent', 'Alumni', 'Others'];
    for (const role of roles) {
        console.log(`Updating Role: ${role}`);
        await prisma.rolePermissions.update({
            where: { role },
            data: {
                programLeadsAccess: true,
                programLeadsScope: 'self',
                externalProgramsAccess: false, // Ambassadors shouldn't manage external programs
                externalProgramsScope: 'none'
            }
        });
    }
    console.log('Permissions updated successfully.');
    await prisma.$disconnect();
}

fixPerms();
