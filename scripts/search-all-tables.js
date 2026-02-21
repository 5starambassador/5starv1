
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const upiId = '641644599191';
    console.log(`Searching for transaction ID: ${upiId} in all tables...`);

    // Search in Payment
    const p1 = await prisma.payment.findMany({
        where: {
            OR: [
                { transactionId: { contains: upiId } },
                { bankReference: { contains: upiId } },
                { gatewayResponse: { string_contains: upiId } } // This might not work depending on DB, but worth a shot
            ]
        }
    });
    console.log(`Payment matches: ${p1.length}`);

    // Search in ActivityLog
    const l1 = await prisma.activityLog.findMany({
        where: {
            description: { contains: upiId }
        }
    });
    console.log(`ActivityLog matches: ${l1.length}`);

    // Search in User
    const u1 = await prisma.user.findMany({
        where: {
            transactionId: { contains: upiId }
        }
    });
    console.log(`User matches: ${u1.length}`);

    // Search in WhatsAppLog
    const w1 = await prisma.whatsAppLog.findMany({
        where: {
            content: { contains: upiId }
        }
    });
    console.log(`WhatsAppLog matches: ${w1.length}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
