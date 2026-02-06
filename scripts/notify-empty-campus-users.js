const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

/**
 * Script to identify and notify Parents with missing campus data
 * Strategy: Option B - Send notification to update profile
 */

async function identifyAndNotifyUsers() {
    console.log('🔍 Identifying Parents with missing campus data...\n');

    try {
        // Find all Parents with empty campus
        const affectedParents = await prisma.user.findMany({
            where: {
                role: 'Parent',
                campusId: null,
                assignedCampus: null
            },
            select: {
                userId: true,
                fullName: true,
                mobileNumber: true,
                email: true,
                status: true,
                benefitStatus: true,
                createdAt: true,
                childInAchariya: true,
                childEprNo: true,
                referralCode: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`📊 Found ${affectedParents.length} Parents with missing campus\n`);

        // Group by status
        const statusBreakdown = affectedParents.reduce((acc, user) => {
            acc[user.status] = (acc[user.status] || 0) + 1;
            return acc;
        }, {});

        console.log('Status Breakdown:');
        Object.entries(statusBreakdown).forEach(([status, count]) => {
            console.log(`  ${status}: ${count} users`);
        });

        // Export to CSV for notifications
        const csvHeader = 'UserID,FullName,MobileNumber,Email,Status,BenefitStatus,ChildInAchariya,ChildERP,ReferralCode,RegistrationDate\n';
        const csvRows = affectedParents.map(user => {
            return [
                user.userId,
                `"${user.fullName}"`,
                user.mobileNumber,
                user.email || 'N/A',
                user.status,
                user.benefitStatus,
                user.childInAchariya ? 'Yes' : 'No',
                user.childEprNo || 'N/A',
                user.referralCode,
                user.createdAt.toISOString().split('T')[0]
            ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;
        fs.writeFileSync('affected-parents-campus-missing.csv', csvContent);

        console.log('\n✅ Exported to: affected-parents-campus-missing.csv');

        // Mark users as needing profile completion
        console.log('\n📝 Marking users for profile completion...');

        const updateResult = await prisma.user.updateMany({
            where: {
                role: 'Parent',
                campusId: null,
                assignedCampus: null
            },
            data: {
                // Keep current status, but we'll track this separately
                // Option: Set benefitStatus to Pending to prevent benefits until campus is set
                benefitStatus: 'Pending'
            }
        });

        console.log(`✅ Updated ${updateResult.count} users - benefits pending until campus is updated\n`);

        // Generate SMS/Email template
        const smsTemplate = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 SMS NOTIFICATION TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear Ambassador,

Your Achariya Partnership Program profile is incomplete. Please update your child's campus information to activate your benefits.

👉 Login: https://achariya-app.com
📧 Profile → Update Campus

Your referral code: {{REFERRAL_CODE}}

Thank you!
Achariya Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

        const emailTemplate = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 EMAIL NOTIFICATION TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: Complete Your Achariya Ambassador Profile

Dear {{FULL_NAME}},

We noticed that your Achariya Partnership Program (APP) profile is missing campus information for your child.

To activate your referral benefits and rewards, please:

1. Login to your account at https://achariya-app.com
2. Go to Profile Settings
3. Update your child's campus information

Your Details:
- Mobile: {{MOBILE}}
- Referral Code: {{REFERRAL_CODE}}
- Registration Date: {{DATE}}

📞 Need help? Contact support at support@achariya.com

Best regards,
Achariya Ambassador Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

        fs.writeFileSync('notification-sms-template.txt', smsTemplate);
        fs.writeFileSync('notification-email-template.txt', emailTemplate);

        console.log('📄 Templates saved:');
        console.log('  - notification-sms-template.txt');
        console.log('  - notification-email-template.txt');

        // Sample users to contact (first 10)
        console.log('\n👥 Sample Users to Contact (First 10):');
        console.log('═══════════════════════════════════════════════════════════════════════');
        affectedParents.slice(0, 10).forEach(user => {
            console.log(`ID: ${user.userId} | ${user.fullName} | ${user.mobileNumber} | ${user.status}`);
        });
        console.log('═══════════════════════════════════════════════════════════════════════');

        // Summary
        console.log('\n📋 SUMMARY:');
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log(`✅ Identified: ${affectedParents.length} Parents`);
        console.log(`✅ Exported: affected-parents-campus-missing.csv`);
        console.log(`✅ Updated: ${updateResult.count} users (benefits pending)`);
        console.log(`✅ Templates: SMS & Email notification templates created`);
        console.log('═══════════════════════════════════════════════════════════════════════');

        console.log('\n📌 NEXT STEPS:');
        console.log('1. Review CSV file: affected-parents-campus-missing.csv');
        console.log('2. Use SMS/Email templates to notify users');
        console.log('3. Monitor profile completion');
        console.log('4. Re-run this script to track progress');
        console.log('5. Once users update, their benefitStatus will auto-change\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
identifyAndNotifyUsers();
