
import { aliasTokens, resolveWhatsAppVariables } from '../src/lib/campaign-utils';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugReferralResolution() {
    console.log("--- 🕵️ DEEP RESOLUTION DIAGNOSTIC ---");
    
    const campaignId = 36;
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    
    if (!campaign) {
        console.error("Campaign 36 not found");
        return;
    }

    const mapping = campaign.waVariableMapping as any;
    console.log("Campaign 36 Mapping:", JSON.stringify(mapping, null, 2));

    // Simulate a Referral recipient
    const mockReferral = {
        fullName: "Tamil Selvi",
        studentName: "Varsha",
        mobileNumber: "919442266704",
        assignedCampus: "Abson - Kalapet",
        role: "Referral",
        referralCode: "TEST-REF-001", // Simulated
        referrerCode: "TEST-REF-001",
        programSlug: "", // Explicitly empty to test fallback link
    };

    console.log("\n1. Testing Variable 3 (Picker) directly via aliasTokens...");
    const var3Mapping = mapping["3"];
    const directResult = await aliasTokens(var3Mapping, mockReferral, "REFERRALS");
    console.log(`Input: "${var3Mapping}" -> Result: "${directResult}"`);

    console.log("\n2. Testing entire array via resolveWhatsAppVariables...");
    const { waVars } = await resolveWhatsAppVariables(mockReferral, "REFERRALS", mapping, 3);
    console.log("Final waVars:", JSON.log ? '' : waVars);
    
    if (waVars[2]?.includes('/p/admission')) {
        console.error("\n❌ BUG DETECTED: Variable 3 resolved to Admission Link instead of WOW Summer Camp!");
        
        // Let's see if Pattern A regex in my head matches what's in the file
        const pickerRegex = /{ProgramLink:([^}]+)}/gi;
        const matches = var3Mapping.match(pickerRegex);
        console.log(`Regex Match Check: ${matches ? 'YES' : 'NO'}`);
    } else {
        console.log("\n✅ SUCCESS: Variable 3 resolved to Program Link.");
    }
}

debugReferralResolution().catch(console.error).finally(() => prisma.$disconnect());
