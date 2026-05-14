
const { syncProgramLeads } = require('../src/app/program-actions');

async function testSync() {
    console.log('--- Triggering Real Sync ---');
    try {
        const result = await syncProgramLeads();
        console.log('Sync result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            const totalUpdated = result.results.reduce((acc, r) => acc + (r.synced || 0), 0);
            console.log(`\nSuccessfully updated ${totalUpdated} leads.`);
        } else {
            console.error('Sync failed:', result.error);
        }
    } catch (error) {
        console.error('Sync error:', error);
    }
}

testSync().then(() => process.exit());
