import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkFees() {
    const campus = await prisma.campus.findFirst({
        where: { campusName: 'ASM - VILLUPURAM' }
    });
    
    if (campus) {
        const fee = await prisma.gradeFee.findFirst({
            where: { campusId: campus.id, grade: 'Grade-1' }
        });
        console.log('Campus Found:', campus.campusName);
        console.log('Grade 1 Fee:', fee?.annualFee);
        if (fee?.annualFee) {
            console.log('5% Slab Reward would be:', (fee.annualFee * 0.05).toLocaleString());
        }
    } else {
        console.log('Campus not found');
    }
    await prisma.$disconnect();
}

checkFees().catch(console.error);
