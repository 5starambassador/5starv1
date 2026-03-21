import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyFixedQuery() {
    console.log('--- VERIFYING FIXED QUERY ---');
    const academicYear = '2026-2027';
    
    try {
        const user = await prisma.user.findFirst({
            where: {
                userId: 19,
                status: 'Active', // Strict Enum
                OR: [
                    { 
                        referrals: { 
                            some: { 
                                leadStatus: { in: ['Confirmed', 'Admitted'] }, // Strict Enum
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
                        leadStatus: { in: ['Confirmed', 'Admitted'] } 
                    } 
                }
            }
        });

        if (user) {
            console.log(`SUCCESS: Fetched ${user.fullName} with ${user.referrals.length} referrals.`);
        } else {
            console.log('User 19 not found (might be status mismatch).');
            const raw = await prisma.user.findUnique({ where: { userId: 19 } });
            console.log('Raw status:', raw?.status);
        }
    } catch (e: any) {
        console.error('STILL CRASHING:', e.message);
    }

    await prisma.$disconnect();
}

verifyFixedQuery();
