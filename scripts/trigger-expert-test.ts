import { sendTestCampaignMessage } from '../src/app/campaign-actions'

async function triggerLiveTest() {
    console.log('--- 🚀 TRIGGERING LIVE EXPERT TEST ---')
    
    // Using the campaign ID 34 which was mentioned in previous sessions as a focus
    const result = await sendTestCampaignMessage(
        34, 
        '9442266704', 
        'REFERRALS', 
        {
            "1": "{Name}",
            "2": "STATIC",
            "static_1": "Achariya Global",
            "3": "{ReferralLink}" // <--- TESTING THE /r/ LINK MAPPING
        }
    )
    
    console.log('Result:', result)
}

triggerLiveTest().catch(console.error)
