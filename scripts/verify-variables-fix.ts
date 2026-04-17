import { aliasTokens } from '../src/app/campaign-dispatcher';

async function main() {
    console.log('🚀 Starting WhatsApp Token Verification...');

    const mockUser = {
        fullName: 'Sathish Raja',
        visitorName: 'Lead Parent',
        studentName: 'Test Student',
        assignedCampus: 'ADYAR',
        mobileNumber: '9965544052',
        referralCode: 'ACH26-REF',
        role: 'Lead'
    };

    console.log('\n--- 🔍 TESTING BARE KEYS ---');
    const tests = [
        { input: 'Name', expected: 'Sathish Raja' },
        { input: 'campus', expected: 'ADYAR' },
        { input: 'programLink', expected: 'https://www.5starambassador.com' }, // Default link in aliasTokens
        { input: '{Name}', expected: 'Sathish Raja' } // Wrapped should still work
    ];

    for (const test of tests) {
        const result = await aliasTokens(test.input, mockUser, 'PROGRAM_LEADS');
        const success = result.includes(test.expected) || result === test.expected;
        console.log(`Input: "${test.input}" -> Result: "${result}" | ${success ? '✅ SUCCESS' : '❌ FAILURE'}`);
    }

    console.log('\n--- 🔍 TESTING FALLBACKS ---');
    const emptyUser = { mobileNumber: '123' };
    const fallbackTest = await aliasTokens('Name', emptyUser, 'PROGRAM_LEADS');
    console.log(`Input: "Name" with Empty User -> Result: "${fallbackTest}" (Expected: Recipient/Friend/Recipient)`);
    
    if (fallbackTest === 'Recipient' || fallbackTest === 'Friend') {
         console.log('✅ Fallback system working.');
    } else {
         console.log('❌ Unexpected fallback result.');
    }
}

main().catch(console.error);
