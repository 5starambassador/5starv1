import { normalizeScientificNotation } from '../lib/utils';

function test() {
    const testCases = [
        { input: '402518123456', expected: '402518123456', desc: 'Plain 12-digit UTR' },
        { input: '6.02073E+11', expected: '602073000000', desc: 'Scientific Notation (UPPER)' },
        { input: '6.02073e+11', expected: '602073000000', desc: 'Scientific Notation (lower)' },
        { input: 'ABC123456789', expected: 'ABC123456789', desc: 'Alphanumeric UTR' },
        { input: '25', expected: '25', desc: 'Small number' },
        { input: 'Not a number', expected: 'Not a number', desc: 'Non-numeric string' },
        { input: null, expected: '', desc: 'Null input' },
        { input: undefined, expected: '', desc: 'Undefined input' },
        { input: '  6.02E+11  ', expected: '602000000000', desc: 'Scientific with whitespace' },
    ];

    console.log('--- UTR Normalization Tests ---');
    let passed = 0;
    testCases.forEach((tc, i) => {
        const result = normalizeScientificNotation(tc.input);
        if (result === tc.expected) {
            console.log(`✅ Test ${i + 1} Passed: ${tc.desc}`);
            passed++;
        } else {
            console.log(`❌ Test ${i + 1} Failed: ${tc.desc}`);
            console.log(`   Input:    ${tc.input}`);
            console.log(`   Expected: ${tc.expected}`);
            console.log(`   Actual:   ${result}`);
        }
    });

    console.log(`\nSummary: ${passed}/${testCases.length} tests passed.`);
}

test();
