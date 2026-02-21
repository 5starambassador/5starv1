
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking constraints for User-related tables...");

    const tables = ['Payment', 'ReferralLead', 'Settlement', 'Notification', 'DeviceToken', 'ProgramLead', 'SupportTicket'];

    for (const table of tables) {
        const constraints = await prisma.$queryRawUnsafe(`
            SELECT
                conname AS constraint_name,
                a.attname AS column_name,
                confrelid::regclass AS foreign_table_name,
                af.attname AS foreign_column_name
            FROM
                pg_constraint c
            JOIN
                pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
            JOIN
                pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
            WHERE
                c.conrelid = '"${table}"'::regclass
                AND c.contype = 'f';
        `);

        console.log(`\nTable: ${table}`);
        console.log(JSON.stringify(constraints, null, 2));
    }
}

main()
    .catch((e) => {
        console.error("Error checking constraints:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
