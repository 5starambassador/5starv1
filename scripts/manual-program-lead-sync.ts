
import { syncProgramLeads } from '../src/app/program-actions'
import prisma from '../src/lib/prisma'

async function runManualSync() {
    console.log('--- Manual Program Lead Sync Starting ---')
    try {
        const result = await syncProgramLeads()
        console.log('Result:', JSON.stringify(result, null, 2))
        
        if (result.success && result.results) {
            const totalUpdated = result.results.reduce((acc: number, r: any) => acc + (r.synced || 0), 0)
            console.log(`\nSuccessfully synced. Total leads updated: ${totalUpdated}`)
        } else if (result.success) {
            console.log('\nSuccessfully synced, but no detailed results returned.')
        } else {
            console.error('Sync failed:', result.error)
        }
    } catch (error) {
        console.error('An error occurred during sync:', error)
    } finally {
        await prisma.$disconnect()
    }
}

runManualSync()
