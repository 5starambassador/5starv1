import { whatsappService } from '../src/lib/whatsapp-service';

async function verify() {
    const testMobile = "917021319772"; // User's mobile
    const campaignTemplate = "referral followup 2";
    const campaignHeader = "https://5starambassador.com/assets/marketing/Referral followup02.jpeg";
    
    console.log("🚀 Testing ACTUAL Campaign Payload (with spaces in Name & URL)...");
    
    const res = await whatsappService.sendBulkTemplateMessage(
        [{ mobile: testMobile, variables: ["Parent Name", "Campus Name"] }],
        campaignTemplate,
        "CAMPAIGN_TEST",
        `ACTUAL_VFY_${Date.now()}`,
        campaignHeader
    );

    console.log("Result:", JSON.stringify(res, null, 2));
    if (res.success) {
        console.log("✅ SUCCESS: Payload accepted. Check phone for ACTUAL CAMPAIGN message!");
    } else {
        console.error("❌ FAILED:", res.error);
    }
}

verify().catch(console.error);
