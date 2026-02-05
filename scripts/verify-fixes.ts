

import { generateSmartReferralCode } from '../src/lib/referral-service';
// import { ROLE_PERMISSIONS } from '../src/lib/permissions'; // Not exported

async function verify() {
    console.log("=== Verifying Referral Code Logic ===");
    const year = new Date().getFullYear().toString().slice(-2);

    const roles = ['Parent', 'Staff', 'Alumni'];
    for (const role of roles) {
        const code = await generateSmartReferralCode(role);
        console.log(`Role: ${role.padEnd(10)} -> Code: ${code}`);

        const expectedPrefix = `ACH${year}-`;
        if (!code.startsWith(expectedPrefix)) {
            console.error(`[FAIL] ${role} code does not start with ${expectedPrefix}`);
        } else {
            console.log(`[PASS] ${role} format correct.`);
        }
    }

    console.log("\n=== Permissions Matrix Check Skipped ===");
    console.log("Note: ROLE_PERMISSIONS is not directly exported. Use getMyPermissions() instead.");

    // The permissions matrix is now managed via database and accessed through getMyPermissions()
    // See src/lib/permission-service.ts for the proper way to check permissions
}

verify().catch(console.error);
