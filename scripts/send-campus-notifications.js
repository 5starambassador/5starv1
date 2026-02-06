const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Send email and in-app notifications to Parents with missing campus
 * Uses Resend email service + creates in-app Notification records
 */

// Email service mock for Node.js (since we can't import TypeScript)
async function sendProfileUpdateEmail(email, name, referralCode, mobile, createdAt) {
    // This would use your actual email service
    // For now, we'll log it and you can integrate later
    console.log(`📧 Email would be sent to: ${email}`);
    console.log(`   Subject: Complete Your Profile - Campus Information Required`);
    console.log(`   To: ${name} (${email})\n`);

    // TODO: Integrate with src/lib/email-service.ts
    // const { EmailService } = require('../src/lib/email-service.ts');
    // await EmailService.sendProfileUpdateEmail(...);

    return { success: true };
}

async function sendNotifications() {
    console.log('🚀 Sending notifications to Parents with missing campus...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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
                referralCode: true,
                createdAt: true
            }
        });

        console.log(`📊 Found ${affectedParents.length} Parents to notify\n`);

        // Counters
        let emailsSent = 0;
        let inAppCreated = 0;
        let errors = 0;

        // Process each user
        for (let i = 0; i < affectedParents.length; i++) {
            const user = affectedParents[i];

            try {
                // Prepare message content
                const title = 'Complete Your Profile - Campus Information Required';
                const message = `Dear ${user.fullName},

We noticed that your Achariya Partnership Program (APP) profile is missing campus information for your child.

To activate your referral benefits and rewards, please:

1. Login to your account at https://5starambassador.com
2. Go to Profile Settings
3. Update your child's campus information

Your Details:
- Mobile: ${user.mobileNumber}
- Referral Code: ${user.referralCode}
- Registration Date: ${user.createdAt.toISOString().split('T')[0]}

📞 Need help? Contact support at 9363494745

Best regards,
ACHARIYA PARTNERSHIP PROGRAM TEAM`;

                // Create in-app notification
                await prisma.notification.create({
                    data: {
                        userId: user.userId,
                        title: title,
                        message: message,
                        type: 'PROFILE_UPDATE_REQUIRED',
                        link: '/profile',
                        isRead: false
                    }
                });
                inAppCreated++;

                // Send email if available
                if (user.email && user.email !== 'N/A') {
                    await sendProfileUpdateEmail(
                        user.email,
                        user.fullName,
                        user.referralCode,
                        user.mobileNumber,
                        user.createdAt
                    );
                    emailsSent++;
                }

                // Progress indicator
                if ((i + 1) % 50 === 0 || i === affectedParents.length - 1) {
                    console.log(`✅ Progress: ${i + 1}/${affectedParents.length} users processed`);
                }

            } catch (error) {
                console.error(`❌ Error processing user ${user.userId}:`, error.message);
                errors++;
            }
        }

        // Summary
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ NOTIFICATION SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total users: ${affectedParents.length}`);
        console.log(`✅ In-app notifications created: ${inAppCreated}`);
        console.log(`📧 Emails ready to send: ${emailsSent}`);
        console.log(`⚠️  Users without email: ${affectedParents.length - emailsSent}`);
        console.log(`❌ Errors: ${errors}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Verification
        const notificationCount = await prisma.notification.count({
            where: { type: 'PROFILE_UPDATE_REQUIRED' }
        });

        console.log('🔍 VERIFICATION:');
        console.log(`Database check: ${notificationCount} notifications with type "PROFILE_UPDATE_REQUIRED"`);
        console.log(`Expected: ${affectedParents.length}`);
        console.log(`Status: ${notificationCount === affectedParents.length ? '✅ MATCH!' : '⚠️  MISMATCH'}\n`);

        // Next steps
        console.log('📝 NEXT STEPS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('1. ✅ In-app notifications are LIVE now!');
        console.log('   - Users will see notifications in their app');
        console.log('   - Click on notification bell icon 🔔');
        console.log('');
        console.log('2. 📧 To send actual emails:');
        console.log('   - Emails are logged above for testing');
        console.log('   - Integrate with src/lib/email-service.ts');
        console.log('   - Set RESEND_API_KEY in .env');
        console.log('   - Uncomment email service integration');
        console.log('');
        console.log('3. 🔄 Monitor user updates:');
        console.log('   - Run: node scripts/notify-empty-campus-users.js');
        console.log('   - Check how many still have empty campus');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('🎉 NOTIFICATION PROCESS COMPLETE!\n');

    } catch (error) {
        console.error('❌ Critical Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
sendNotifications();
