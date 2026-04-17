import { whatsappService } from '../src/lib/whatsapp-service';
import prisma from '../src/lib/prisma';

async function main() {
    console.log('🚀 Starting WhatsApp Metadata Verification...');

    // 1. Find a sample user
    const user = await prisma.user.findFirst({
        where: { assignedCampus: { not: null } },
        select: { mobileNumber: true, role: true, assignedCampus: true }
    });

    if (!user) {
        console.error('❌ No suitable test user found.');
        return;
    }

    console.log(`📝 Testing with User: ${user.mobileNumber} (Role: ${user.role}, Campus: ${user.assignedCampus})`);

    // 2. Test Safety Lookup (Passing missing metadata)
    console.log('\n🔍 Testing Safety Lookup (Missing Metadata)...');
    // Using a unique content to find the log easily
    const testContentLookup = `METADATA_TEST_LOOKUP_${Date.now()}`;
    await whatsappService.logMessage(
        user.mobileNumber,
        null,
        testContentLookup,
        'TEST',
        'SENT'
    );

    // 3. Test Normalization (Passing lower-case metadata)
    console.log('\n🔍 Testing Normalization (Lower-case metadata)...');
    const testContentNorm = `METADATA_TEST_NORM_${Date.now()}`;
    await whatsappService.logMessage(
        user.mobileNumber,
        null,
        testContentNorm,
        'TEST',
        'SENT',
        undefined, undefined, undefined, undefined, undefined,
        'parent', // lower case role
        'ADYAR' // all caps campus
    );

    // 4. Verify in DB
    console.log('\n✅ Verifying results in WhatsAppLog...');
    
    const logs = await prisma.whatsAppLog.findMany({
        where: { content: { contains: 'METADATA_TEST_' } },
        orderBy: { createdAt: 'desc' },
        take: 2
    });

    logs.forEach(log => {
        console.log(`\n--- Log Result ---`);
        console.log(`Content: ${log.content}`);
        console.log(`Role in DB: "${log.userRole}"`);
        console.log(`Campus in DB: "${log.campus}"`);
        
        if (log.content?.includes('LOOKUP')) {
            const success = log.userRole === user.role && log.campus === user.assignedCampus;
            console.log(success ? '✅ SUCCESS: Lookup resolved correctly.' : '❌ FAILURE: Lookup failed.');
        } else {
            const success = log.userRole === 'Parent' && log.campus === 'ADYAR';
            console.log(success ? '✅ SUCCESS: Normalization applied correctly.' : '❌ FAILURE: Normalization failed.');
        }
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
