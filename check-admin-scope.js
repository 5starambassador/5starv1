const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminScope() {
    console.log('--- Checking Super Admin Scope (Admin Table) ---');

    // 1. Get Super Admin from Admin Table
    // Try both enum key and mapped value just in case, but Enum key is standard
    const admin = await prisma.admin.findFirst({
        where: { role: 'Super_Admin' }
    });

    if (admin) {
        console.log(`Found Super Admin: ${admin.adminName} (ID: ${admin.adminId})`);
        console.log(`Role: ${admin.role}`);
        console.log(`Assigned Campus: ${admin.assignedCampus || 'None (Global)'}`);

        if (admin.assignedCampus) {
            console.log(`ALERT: Super Admin has an assigned campus! This might trigger 'campus' scope.`);
        } else {
            console.log(`Global Access confirmed (no assigned campus).`);
        }
    } else {
        console.log('No Super Admin found in Admin table with role Super_Admin.');

        // Fallback check
        const allAdmins = await prisma.admin.findMany();
        console.log(`Total Admins: ${allAdmins.length}`);
        allAdmins.forEach(a => console.log(`- ${a.adminName} (${a.role})`));
    }

    // 2. Check specific restored leads for campus match
    const leads = await prisma.referralLead.findMany({
        where: { userId: { in: [1177, 1184] } },
        select: { leadId: true, studentName: true, campus: true, leadStatus: true }
    });

    console.log('\n--- Restored Leads Campus Check ---');
    leads.forEach(l => {
        console.log(`Lead ${l.leadId} (${l.studentName}): Campus='${l.campus}', Status='${l.leadStatus}'`);
    });
}

checkAdminScope()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
