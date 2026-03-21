import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deepDiveUser19() {
    console.log('--- DEEP DIVE: USER 19 REFERRALS ---');
    const user = await prisma.user.findUnique({
        where: { userId: 19 },
        include: { referrals: true }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }

    console.log(`User: ${user.fullName}, Role: ${user.role}, ChildInAchariya: ${user.childInAchariya}, Status: ${user.status}`);
    console.log(`Total Referrals in DB: ${user.referrals.length}`);

    user.referrals.forEach(r => {
        console.log(`Referral ${r.leadId}: Status=${r.leadStatus}, AcademicYear=${r.academicYear}, AdmittedYear=${r.admittedYear}, CreatedAt=${r.createdAt.toISOString()}`);
    });

    await prisma.$disconnect();
}

deepDiveUser19();
