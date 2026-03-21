import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deepDiag() {
    console.log('--- DEEP DIAG: SENTHIL NATHAN ---');
    const u = await prisma.user.findFirst({
        where: { fullName: { contains: 'Senthil Nathan', mode: 'insensitive' } },
        include: { referrals: true }
    });
    
    if (u) {
        console.log(`User: ${u.fullName}, ID: ${u.userId}`);
        u.referrals.forEach(r => {
            console.log(`Referral ID: ${r.leadId}`);
            console.log(`  LeadStatus: ${r.leadStatus}`);
            console.log(`  AcademicYear: ${r.academicYear}`);
            console.log(`  AdmittedYear: ${r.admittedYear}`);
            console.log(`  CreatedAt: ${r.createdAt.toISOString()}`);
        });
    }
    
    await prisma.$disconnect();
}

deepDiag();
