
import 'dotenv/config'
import { whatsappService } from '../src/lib/whatsapp-service'

async function testBulk() {
    process.env.WHATSAPP_PROVIDER = 'msg91'
    
    console.log("--- BULK WHATSAPP DELIVERY TEST ---")
    const campaignRequestId = 'camp_bulk_fix_test_' + Date.now()
    
    // Testing with 2 recipients (one real, one bogus but valid format)
    const recipients = [
        { mobile: '9442266704', variables: ['SACHIN', 'TUTICORIN', 'AMBASSADOR'] },
        { mobile: '9123456789', variables: ['TESTER', 'CHENNAI', 'STUDENT'] }
    ]

    const res = await whatsappService.sendBulkTemplateMessage(
        recipients,
        'welcome_message',
        'Campaign',
        campaignRequestId
    )

    console.log('\nResult:', JSON.stringify(res, null, 2))
}

testBulk().catch(console.error)
