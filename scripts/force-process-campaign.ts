
import prisma from '../src/lib/prisma';
import { dispatchCampaignBatch } from '../src/app/campaign-dispatcher';

async function main() {
    const job = await (prisma as any).job.findFirst({ 
        where: { status: 'PENDING', type: 'CAMPAIGN_BATCH' },
        orderBy: { createdAt: 'desc' }
    });
    
    if (!job) {
        console.log('No pending campaign jobs found.');
        process.exit(0);
    }
    
    console.log(`[ForceProcess] Found Job #${job.id} for Campaign #${job.payload.campaignId}. Starting...`);
    
    // Mark as processing
    await (prisma as any).job.update({
        where: { id: job.id },
        data: { status: 'PROCESSING' }
    });

    try {
        const result = await dispatchCampaignBatch(job.payload.campaignId);
        console.log('[ForceProcess] Dispatch Result:', JSON.stringify(result, null, 2));
        
        // Update job status based on hasMore
        await (prisma as any).job.update({
            where: { id: job.id },
            data: { 
                status: (result as any).hasMore ? 'PENDING' : 'COMPLETED',
                updatedAt: new Date()
            }
        });
        
        console.log(`[ForceProcess] Job #${job.id} updated to ${(result as any).hasMore ? 'PENDING' : 'COMPLETED'}`);
    } catch (error) {
        console.error('[ForceProcess] Error:', error);
        await (prisma as any).job.update({
            where: { id: job.id },
            data: { status: 'FAILED', error: (error as any).message }
        });
    }
    
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
