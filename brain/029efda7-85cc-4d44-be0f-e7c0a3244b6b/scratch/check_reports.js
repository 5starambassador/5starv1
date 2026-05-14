require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReportingStatus() {
    console.log("Checking Reporting Status...");

    // 1. Check Campuses
    const campuses = await prisma.campus.findMany();
    console.log("\n--- Campuses ---");
    campuses.forEach(c => {
        console.log(`ID: ${c.id}, Name: ${c.campusName}, Active: ${c.isActive}, Email: ${c.contactEmail}, Phone: ${c.contactPhone}`);
    });

    // 2. Check Recent Confirmed Referrals
    const now = new Date();
    const dailyStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentReferrals = await prisma.referralLead.findMany({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            confirmedDate: { gte: weeklyStart }
        },
        select: {
            leadId: true,
            campus: true,
            leadStatus: true,
            confirmedDate: true,
            studentName: true
        }
    });

    console.log(`\n--- Recent Confirmed Referrals (Last 7 Days) --- Count: ${recentReferrals.length}`);
    recentReferrals.forEach(r => {
        console.log(`ID: ${r.leadId}, Campus: ${r.campus}, Status: ${r.leadStatus}, Date: ${r.confirmedDate.toISOString()}, Student: ${r.studentName}`);
    });

    // 3. Check for Campus Name Mismatches
    const campusNames = campuses.map(c => c.campusName);
    const referralCampuses = [...new Set(recentReferrals.map(r => r.campus))];
    
    console.log("\n--- Campus Name Mismatches ---");
    referralCampuses.forEach(rc => {
        if (!campusNames.includes(rc)) {
            console.log(`MISSING CAMPUS: "${rc}" found in ReferralLead but not in Campus table.`);
        }
    });

    // 4. Check for any activity logs related to reports
    const reportLogs = await prisma.activityLog.findMany({
        where: {
            module: 'SYSTEM',
            action: { contains: 'Report' }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    
    console.log("\n--- Recent Report Activity Logs ---");
    reportLogs.forEach(l => {
        console.log(`Date: ${l.createdAt.toISOString()}, Action: ${l.action}, Desc: ${l.description}`);
    });

    await prisma.$disconnect();
}

checkReportingStatus().catch(e => {
    console.error(e);
    process.exit(1);
});
