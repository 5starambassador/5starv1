import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function searchByName() {
    console.log('--- SEARCH BY NAME: SCREENSHOT USERS ---');
    const names = ['Senthil Nathan', 'Keerthi lingashini T']; 
    
    for (const n of names) {
        const u = await prisma.user.findFirst({
            where: { fullName: { contains: n, mode: 'insensitive' } },
            include: { referrals: true }
        });
        
        if (u) {
            console.log(`User: ${u.fullName}, ID: ${u.userId}, Role: ${u.role}, Status: ${u.status}`);
            console.log(`Referrals: ${u.referrals.length}`);
        } else {
            console.log(`Name ${n} NOT FOUND`);
        }
    }
    
    await prisma.$disconnect();
}

searchByName();
