import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkFees() {
    const campus = await prisma.campus.findFirst({
        where: { campusName: 'ABSM - THENGAITHITTU' }
    });
    
    if (campus) {
        const fees = await prisma.gradeFee.findMany({
            where: { campusId: campus.id }
        });
        console.log(`Fees for ${campus.campusName}:`);
        fees.forEach(f => {
            console.log(`- ${f.grade}: OTP=₹${f.annualFee_otp}, WOTP=₹${f.annualFee_wotp}`);
        });
    } else {
        console.log('Campus not found');
    }
    await prisma.$disconnect();
}

checkFees().catch(console.error);
