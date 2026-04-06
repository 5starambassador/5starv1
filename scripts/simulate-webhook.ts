import prisma from '../src/lib/prisma';
import fetch from 'node-fetch';

async function simulateWebhook() {
    console.log('🧪 Starting Webhook Simulation...');

    // 1. Find the most recent WhatsAppLog that is still in SENT status
    const recentLog = await prisma.whatsAppLog.findFirst({
        where: { status: 'SENT' },
        orderBy: { createdAt: 'desc' }
    });

    if (!recentLog) {
        console.error('❌ No "SENT" logs found to test with. Send a test message first!');
        return;
    }

    console.log(`📍 Found test log: ID=${recentLog.id}, Mobile=${recentLog.mobile}, RefID=${recentLog.refId}`);

    const webhookUrl = 'http://localhost:3000/api/webhooks/msg91';
    
    // Simulate a "DELIVERED" event from MSG91
    const payload = [
        {
            "CRQID": recentLog.refId, // Matching by our refId
            "status": "delivered",
            "mobile": "91" + recentLog.mobile, // MSG91 usually adds 91
            "eventName": "delivered",
            "messageId": "wamid.HBgLOTExOTQ0MjI2NjcwNA=="
        }
    ];

    console.log('📡 Sending simulation payload to:', webhookUrl);
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result: any = await response.json();
        console.log('✅ Webhook Response:', JSON.stringify(result));

        // Wait a bit and check DB
        console.log('⏳ Waiting for DB update...');
        await new Promise(r => setTimeout(r, 2000));

        const updatedLog = await prisma.whatsAppLog.findUnique({
            where: { id: recentLog.id }
        });

        if (updatedLog?.status === 'DELIVERED') {
            console.log('🎉 SUCCESS! Log was updated to DELIVERED');
        } else {
            console.error('❌ FAILURE! Log status is still:', updatedLog?.status);
        }
    } catch (err: any) {
        console.error('💥 Error during simulation:', err.message);
    }
}

simulateWebhook().finally(() => process.exit());
