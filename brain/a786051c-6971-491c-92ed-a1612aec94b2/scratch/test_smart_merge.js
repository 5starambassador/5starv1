
const successKeywords = ['SUCCESS', 'PAID', 'CONFIRMED', 'COMPLETED', 'CAPTURED'];

function deduplicateAndMerge(rawLeads) {
    const deduplicatedMap = new Map();

    for (const lead of rawLeads) {
        const existing = deduplicatedMap.get(lead.mobile);
        if (!existing) {
            deduplicatedMap.set(lead.mobile, { ...lead });
            continue;
        }

        // 1. Prioritize Success Status
        const isNewSuccess = lead.paymentStatus && successKeywords.includes(lead.paymentStatus);
        const isExistingSuccess = existing.paymentStatus && successKeywords.includes(existing.paymentStatus);

        if (isNewSuccess && !isExistingSuccess) {
            console.log(`Upgrading ${lead.mobile} status from ${existing.paymentStatus} to ${lead.paymentStatus}`);
            existing.paymentStatus = lead.paymentStatus;
        }

        // 2. Prioritize Most Complete Name
        if (lead.studentName) {
            if (!existing.studentName || lead.studentName.length > existing.studentName.length) {
                console.log(`Updating ${lead.mobile} name from "${existing.studentName}" to "${lead.studentName}"`);
                existing.studentName = lead.studentName;
            }
        }
    }

    return Array.from(deduplicatedMap.values());
}

const testLeads = [
    { mobile: '8668171736', studentName: 'Natramizh', paymentStatus: 'PENDING' },
    { mobile: '8668171736', studentName: 'Natramizh A', paymentStatus: 'SUCCESS' },
    { mobile: '9999999999', studentName: 'User 2 Original', paymentStatus: 'SUCCESS' },
    { mobile: '9999999999', studentName: 'U2', paymentStatus: 'PENDING' }
];

console.log('--- Testing Smart Merge Deduplication ---');
const result = deduplicateAndMerge(testLeads);
console.log('Final Leads:', JSON.stringify(result, null, 2));

// Assertion
const pavithra = result.find(l => l.mobile === '8668171736');
if (pavithra.paymentStatus === 'SUCCESS' && pavithra.studentName === 'Natramizh A') {
    console.log('PASSED: Pavithra is SUCCESS and Natramizh A');
} else {
    console.error('FAILED: Pavithra result incorrect:', pavithra);
}

const user2 = result.find(l => l.mobile === '9999999999');
if (user2.paymentStatus === 'SUCCESS' && user2.studentName === 'User 2 Original') {
    console.log('PASSED: User 2 stayed SUCCESS and kept longest name');
} else {
    console.error('FAILED: User 2 result incorrect:', user2);
}
