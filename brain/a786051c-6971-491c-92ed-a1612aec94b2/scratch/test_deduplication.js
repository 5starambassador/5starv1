
const successKeywords = ['SUCCESS', 'PAID', 'CONFIRMED', 'COMPLETED', 'CAPTURED'];

function deduplicate(rawLeads) {
    const deduplicatedMap = new Map();

    for (const lead of rawLeads) {
        const existing = deduplicatedMap.get(lead.mobile);
        if (!existing) {
            deduplicatedMap.set(lead.mobile, lead);
            continue;
        }

        const isNewSuccess = lead.paymentStatus && successKeywords.includes(lead.paymentStatus);
        const isExistingSuccess = existing.paymentStatus && successKeywords.includes(existing.paymentStatus);

        if (isNewSuccess && !isExistingSuccess) {
            console.log(`Upgrading ${lead.mobile} from ${existing.paymentStatus} to ${lead.paymentStatus}`);
            deduplicatedMap.set(lead.mobile, lead);
        } else if (lead.studentName && !existing.studentName) {
            existing.studentName = lead.studentName;
        }
    }

    return Array.from(deduplicatedMap.values());
}

const testLeads = [
    { mobile: '8668171736', studentName: 'Natramizh', paymentStatus: 'PENDING' },
    { mobile: '8668171736', studentName: 'Natramizh A', paymentStatus: 'SUCCESS' },
    { mobile: '9999999999', studentName: 'User 2', paymentStatus: 'SUCCESS' },
    { mobile: '9999999999', studentName: 'User 2 Update', paymentStatus: 'PENDING' }
];

console.log('--- Testing Deduplication ---');
const result = deduplicate(testLeads);
console.log('Final Leads:', JSON.stringify(result, null, 2));

// Assertion
const pavithra = result.find(l => l.mobile === '8668171736');
if (pavithra.paymentStatus === 'SUCCESS') {
    console.log('PASSED: Pavithra is SUCCESS');
} else {
    console.error('FAILED: Pavithra is ' + pavithra.paymentStatus);
}

const user2 = result.find(l => l.mobile === '9999999999');
if (user2.paymentStatus === 'SUCCESS') {
    console.log('PASSED: User 2 stayed SUCCESS');
} else {
    console.error('FAILED: User 2 is ' + user2.paymentStatus);
}
