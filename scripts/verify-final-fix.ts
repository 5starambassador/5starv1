
import { resolveWhatsAppVariables } from '../src/lib/campaign-utils';

async function testFinalFix() {
    console.log("--- 🕵️ FINAL BUG-FIX VERIFICATION ---");

    const mockReferral = {
        fullName: "Tamil Selvi",
        studentName: "Student", // Triggers 'fail' condition
        referralCode: "REF-WOW-123",
        referrerCode: "REF-WOW-123",
        programSlug: "", // Generic slug is empty
    };

    const mapping = {
        "1": "{Name}",
        "2": "{Campus}",
        "3": "{ProgramLink:wow-summer-camp}"
    };

    console.log("Simulating resolution for Referral with 'Student' as studentName (triggering recovery)...");
    
    // We expect Variable 3 to resolve to Summer Camp, even if recovery is triggered
    const { waVars } = await resolveWhatsAppVariables(mockReferral, "REFERRALS", mapping, 3);
    
    console.log("Variable 1:", waVars[0]);
    console.log("Variable 2:", waVars[1]);
    console.log("Variable 3 (Result):", waVars[2]);

    if (waVars[2].includes('wow-summer-camp')) {
        console.log("\n✅ SUCCESS: Recovery respected the specific picker selection!");
    } else if (waVars[2].includes('admission')) {
        console.error("\n❌ FAILURE: Still falling back to generic Admission link.");
    } else {
        console.error("\n❌ UNEXPECTED RESULT:", waVars[2]);
    }
}

testFinalFix().catch(console.error);
