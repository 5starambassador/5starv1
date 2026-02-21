const { reconcileAllUsers } = require('./src/app/reconciliation-actions');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit() {
    console.log('--- STARTING SYSTEM-WIDE AUDIT ---');
    console.log('Scanning for users with paid status but missing student records...');

    try {
        const result = await reconcileAllUsers();
        console.log('--- AUDIT RESULTS ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

runAudit();
