import { whatsappService } from '../src/lib/whatsapp-service'

async function verify() {
    console.log('🚀 Starting Final WhatsApp API Verification...')
    
    const testMobile = '9442266704'
    const templateName = 'referral_followup_2'
    const variables = ['Rajak', 'ABSM - THENGAITHITTU']
    const headerUrl = 'https://5starambassador.com/assets/marketing/Referral followup02.jpeg' // Raw URL with spaces
    
    console.log(`📡 Sending test to ${testMobile}...`)
    
    try {
        const result = await whatsappService.sendTemplateMessage(
            testMobile,
            templateName,
            variables,
            'TEST_VERIFY',
            `VERIFY_${Date.now()}`,
            headerUrl
        )
        
        console.log('✅ MSG91 Response Result:', JSON.stringify(result, null, 2))
        
        if (result.success) {
            console.log('\n🌟 SUCCESS! The payload structure is now accepted by MSG91.')
            console.log('Check your phone for the message with the image header.')
        } else {
            console.error('\n❌ FAILED:', result.error)
        }
    } catch (error) {
        console.error('\n💥 EXCEPTION:', error)
    }
}

verify().then(() => process.exit(0))
