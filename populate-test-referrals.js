const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateReferrals() {
    console.log('--- Creating Previous Year Referrals for Thirumoorthi R ---');
    const searchTerm = 'Thirumoorthi';
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: searchTerm, mode: 'insensitive' } }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }

    // Identify a Campus (or default)
    const campus = await prisma.campus.findFirst();

    // Create 5 Referrals for 2024-2025
    for (let i = 1; i <= 5; i++) {
        await prisma.referralLead.create({
            data: {
                userId: user.userId,
                parentName: `Prev Year Parent ${i}`,
                parentMobile: `900000000${i}`,
                studentName: `Prev Year Student ${i}`,
                gradeInterested: 'Grade 1',
                campusId: campus ? campus.id : undefined,
                leadStatus: 'Confirmed',
                admittedYear: '2024-2025',
                createdAt: new Date('2024-06-15'), // Mid 2024
                referralCode: user.referralCode,
                annualFee: 60000 // Ensure actual fee is set
            }
        });
        console.log(`Created Confirmed Referral ${i} for 2024-2025`);
    }

    // Create 1 Referral for Current Year (to trigger Active status)
    await prisma.referralLead.create({
        data: {
            userId: user.userId,
            parentName: `Current Year Parent 1`,
            parentMobile: `9990000001`,
            studentName: `Current Student 1`,
            gradeInterested: 'Grade 1',
            campusId: campus ? campus.id : undefined,
            leadStatus: 'Confirmed',
            admittedYear: '2025-2026',
            createdAt: new Date(), // Now
            referralCode: user.referralCode,
            annualFee: 60000
        }
    });

    console.log('Setup Complete.');
}

populateReferrals()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
