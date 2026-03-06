
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- SEARCHING FOR MIVITH ---');
    const leads = await prisma.referralLead.findMany({
        where: { studentName: { contains: 'Mivith' } },
        select: {
            leadId: true,
            studentName: true,
            leadStatus: true,
            admissionFeeCollected: true,
            donationFeeCollected: true,
            annualFee: true
        }
    });
    console.log(JSON.stringify(leads, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
