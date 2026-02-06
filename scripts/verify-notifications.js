const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log('🔍 Verifying notification creation...\n');

    try {
        // Count notifications
        const notificationCount = await prisma.notification.count({
            where: { type: 'PROFILE_UPDATE_REQUIRED' }
        });

        // Sample notifications
        const sampleNotifications = await prisma.notification.findMany({
            where: { type: 'PROFILE_UPDATE_REQUIRED' },
            include: {
                user: {
                    select: {
                        fullName: true,
                        mobileNumber: true,
                        email: true
                    }
                }
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 VERIFICATION RESULTS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Total notifications created: ${notificationCount}`);
        console.log(`📅 Type: PROFILE_UPDATE_REQUIRED`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📋 Sample Notifications (Latest 5):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        sampleNotifications.forEach((notif, i) => {
            console.log(`${i + 1}. ${notif.user?.fullName || 'Unknown'}`);
            console.log(`   Mobile: ${notif.user?.mobileNumber || 'N/A'}`);
            console.log(`   Email: ${notif.user?.email || 'N/A'}`);
            console.log(`   Title: ${notif.title}`);
            console.log(`   Read: ${notif.isRead ? 'Yes' : 'No'}`);
            console.log(`   Created: ${notif.createdAt.toLocaleString()}`);
            console.log('');
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('✅ Verification complete!');
        console.log('Users can now see these notifications in their app! 🔔\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
