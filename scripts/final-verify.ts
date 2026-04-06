import { whatsappService } from '../src/lib/whatsapp-service';

async function verify() {
    const testMobile = "917021319772"; // User's mobile
    console.log("🚀 Testing 100% FIXED Payload with Correct Parameters...");
    
    const res = await whatsappService.sendBulkTemplateMessage(
        [{ mobile: testMobile, variables: ["123456"] }], // Correct count (1) for referral_otp
        "referral_otp",
        "CAMPAIGN_TEST",
        `FINAL_VFY_${Date.now()}`
    );

    console.log("Result:", JSON.stringify(res, null, 2));
    if (res.success) {
        console.log("✅ SUCCESS: Payload accepted. Check phone!");
    } else {
        console.error("❌ FAILED:", res.error);
    }
}

verify().catch(console.error);
