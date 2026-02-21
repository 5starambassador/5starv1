import { logAction } from '../src/lib/audit-logger'
import * as dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function runTest() {
    console.log('🚀 Sending Test Audit Log to Discord...')

    try {
        await logAction(
            'SYSTEM_TEST',
            'SECURITY',
            'Verification test for Phase 3a: Discord Webhook Integration. If you see this in Discord, it works! ✅',
            'TEST-ID',
            null,
            { test: true, environment: 'development' }
        )

        console.log('✅ Test log triggered. Check your Discord channel!')
        // Wait a bit for the fire-and-forget Discord alert to finish
        await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (err) {
        console.error('❌ Test failed:', err)
    }
}

runTest()
