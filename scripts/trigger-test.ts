import { sendTestCampaignMessage } from '../src/app/campaign-actions';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function triggerTest() {
    console.log('--- TRIGGERING TEST DISPATCH FOR CAMPAIGN 34 ---');
    try {
        const result = await sendTestCampaignMessage(34, '919944600905'); // Using the user's mobile from earlier logs
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error('Trigger failed:', e.message);
    }
}

triggerTest();
