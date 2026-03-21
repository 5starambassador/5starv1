import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugUser19() {
    console.log('--- TARGETED DEBUG: USER 19 ---');
    const academicYear = '2026-2027';
    
    // Exact filter from the action
    const user = await prisma.user.findFirst({
        where: {
            userId: 19,
            status: 'Active',
            OR: [
                { 
                    referrals: { 
                        some: { 
                            leadStatus: { in: ['Confirmed', 'Admitted', 'CONFIRMED', 'ADMITTED'] },
                            OR: [
                                { academicYear: academicYear },
                                { admittedYear: academicYear },
                                { createdAt: { gte: new Date('2026-01-01') } }
                            ]
                        } 
                    } 
                },
                { childInAchariya: true }
            ]
        },
        include: {
            referrals: {
                where: {
                    leadStatus: { in: ['Confirmed', 'Admitted', 'CONFIRMED', 'ADMITTED'] }
                }
            }
        }
    });

    if (!user) {
        console.log('User 19 EXCLUDED by the main filter!');
        // Find out why
        const raw = await prisma.user.findUnique({ 
            where: { userId: 19 },
            include: { referrals: true }
        });
        console.log('Raw User Data:', JSON.stringify({
            status: raw?.status,
            childInAchariya: raw?.childInAchariya,
            referralCount: raw?.referrals.length,
            referralStatuses: raw?.referrals.map(r => r.leadStatus)
        }, null, 2));
    } else {
        console.log('User 19 FETCHED successfully.');
        console.log(`Included Referrals: ${user.referrals.length}`);
    }

    await prisma.$disconnect();
}

debugUser19();
