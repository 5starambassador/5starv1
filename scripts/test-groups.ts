
const { getAccruedPayoutLiabilities } = require('../src/app/finance-actions');

async function test() {
    console.log('--- TESTING GROUP A ---');
    const resA = await getAccruedPayoutLiabilities('2026-2027', undefined, undefined, 1, 100, 'A');
    console.log('Group A Count:', resA.data?.length || 0);
    if (resA.data && resA.data.length > 0) {
        console.log('First Group A User Role:', resA.data[0].role);
        console.log('First Group A ChildInAchariya:', resA.data[0].childInAchariya);
    }

    console.log('\n--- TESTING GROUP B ---');
    const resB = await getAccruedPayoutLiabilities('2026-2027', undefined, undefined, 1, 100, 'B');
    console.log('Group B Count:', resB.data?.length || 0);
    if (resB.data && resB.data.length > 0) {
        console.log('First Group B User Role:', resB.data[0].role);
        console.log('First Group B ChildInAchariya:', resB.data[0].childInAchariya);
    }
}

test().catch(console.error);
