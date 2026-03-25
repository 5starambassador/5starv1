
const { whatsappService } = require('./src/lib/whatsapp-service')

async function test() {
    process.env.WHATSAPP_PROVIDER = 'msg91'
    
    const campaignRequestId = 'camp_18_fix_test_' + Date.now()
    console.log(`Testing with Request ID: ${campaignRequestId}`)

    const res = await whatsappService.sendBulkTemplateMessage(
        [{
            mobile: '9442266704',
            variables: ['SACHIN', 'TUTICORIN', 'AMBASSADOR']
        }],
        'welcome_message',
        'Campaign',
        campaignRequestId
    )

    console.log('Result:', JSON.stringify(res, null, 2))
}

test().catch(console.error)
