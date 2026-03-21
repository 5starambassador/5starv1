import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function diagnostic() {
    console.log('--- DIAGNOSTIC: SCREENSHOT USERS ---');
    const mobiles = ['9489669950', '9976888726']; // From screenshots (Senthil Nathan, Keerthi)
    
    for (const m of mobiles) {
        const u = await prisma.user.findFirst({
            where: { mobileNumber: { contains: m } },
            include: { referrals: true }
        });
        
        if (u) {
            console.log(`User: ${u.fullName}, Role: ${u.role}, Status: ${u.status}, ChildInAchariya: ${u.childInAchariya}`);
            console.log(`Referrals (${u.referrals.length}):`);
            u.referrals.forEach(r => {
                console.log(`  - ID: ${r.leadId}, Status: ${r.leadStatus}, AcademicYear: ${r.academicYear}, AdmittedYear: ${r.admittedYear}, CreatedAt: ${r.createdAt.toISOString()}`);
            });
        } else {
            console.log(`Mobile ${m} NOT FOUND`);
        }
    }
    
    await prisma.$disconnect();
}

diagnostic();
