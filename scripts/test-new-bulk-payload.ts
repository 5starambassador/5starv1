import { whatsappService } from '../src/lib/whatsapp-service';

async function verify() {
    const testMobile = "917021319772"; // User's mobile from previous successful log
    console.log("🚀 Testing New 100% Safety Bulk Payload...");
    
    const res = await whatsappService.sendBulkTemplateMessage(
        [{ mobile: testMobile, variables: ["VERIFIED", "Senior Expert Fix"] }],
        "referral_otp", // Using a known template for testing
        "CAMPAIGN_TEST",
        `VFY_${Date.now()}`
    );

    console.log("Result:", JSON.stringify(res, null, 2));
    if (res.success) {
        console.log("✅ SUCCESS: Payload accepted by MSG91!");
    } else {
        console.error("❌ FAILED:", res.error);
    }
}

verify().catch(console.error);
