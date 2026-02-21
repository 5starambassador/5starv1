
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Applying ON DELETE CASCADE to foreign keys...");

    const updates = [
        { table: 'Payment', column: 'userId', constraint: 'Payment_userId_fkey' },
        { table: 'ReferralLead', column: 'userId', constraint: 'ReferralLead_userId_fkey' },
        { table: 'Settlement', column: 'userId', constraint: 'Settlement_userId_fkey' },
        { table: 'Notification', column: 'userId', constraint: 'Notification_userId_fkey' },
        { table: 'DeviceToken', column: 'userId', constraint: 'DeviceToken_userId_fkey' },
        { table: 'ProgramLead', column: 'referrerId', constraint: 'ProgramLead_referrerId_fkey' },
        { table: 'SupportTicket', column: 'userId', constraint: 'SupportTicket_userId_fkey' }
    ];

    for (const update of updates) {
        try {
            console.log(`Updating ${update.table}...`);
            // Drop existing
            await prisma.$executeRawUnsafe(`ALTER TABLE "${update.table}" DROP CONSTRAINT IF EXISTS "${update.constraint}";`);
            // Add with CASCADE
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "${update.table}" 
                ADD CONSTRAINT "${update.constraint}" 
                FOREIGN KEY ("${update.column}") 
                REFERENCES "User"("userId") 
                ON DELETE CASCADE;
            `);
            console.log(`Successfully updated ${update.table}`);
        } catch (e: any) {
            console.error(`Failed to update ${update.table}:`, e.message);
        }
    }
}

main()
    .catch((e) => {
        console.error("Critical error in SQL update:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
