const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixData() {
    console.log('--- Starting Data Alignment Fix ---');

    // Find users where bankName looks like an account number (long digits)
    // and accountNumber looks like an IFSC (4 uppercase letters + 0)
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { bankName: { contains: '0' } }, // rough check for numeric
                { accountNumber: { startsWith: 'A' } }, // Rough check for IFSC
                { accountNumber: { startsWith: 'B' } },
                { accountNumber: { startsWith: 'C' } },
                { accountNumber: { startsWith: 'D' } },
                { accountNumber: { startsWith: 'E' } },
                { accountNumber: { startsWith: 'F' } },
                { accountNumber: { startsWith: 'G' } },
                { accountNumber: { startsWith: 'H' } },
                { accountNumber: { startsWith: 'I' } },
                { accountNumber: { startsWith: 'J' } },
                { accountNumber: { startsWith: 'K' } },
                { accountNumber: { startsWith: 'L' } },
                { accountNumber: { startsWith: 'M' } },
                { accountNumber: { startsWith: 'N' } },
                { accountNumber: { startsWith: 'O' } },
                { accountNumber: { startsWith: 'P' } },
                { accountNumber: { startsWith: 'Q' } },
                { accountNumber: { startsWith: 'R' } },
                { accountNumber: { startsWith: 'S' } },
                { accountNumber: { startsWith: 'T' } },
                { accountNumber: { startsWith: 'U' } },
                { accountNumber: { startsWith: 'V' } },
                { accountNumber: { startsWith: 'W' } },
                { accountNumber: { startsWith: 'X' } },
                { accountNumber: { startsWith: 'Y' } },
                { accountNumber: { startsWith: 'Z' } }
            ]
        }
    });

    console.log(`Checking ${users.length} potential misaligned users...`);

    let fixCount = 0;
    for (const user of users) {
        const bankName = user.bankName || '';
        const accNo = user.accountNumber || '';
        const ifsc = user.ifscCode || '';

        // Case 1: Account Number is in Bank Name, IFSC is in Account Number
        const isBankActuallyAcc = /^\d{9,20}$/.test(bankName.trim());
        const isAccActuallyIFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(accNo.trim());

        if (isBankActuallyAcc && isAccActuallyIFSC) {
            console.log(`Fixing User: ${user.fullName} (${user.mobileNumber})`);
            console.log(`  Current -> Bank: ${bankName}, Acc: ${accNo}, IFSC: ${ifsc}`);

            // We don't know the real bank name, so we'll leave it empty for now 
            // but move Acc and IFSC to their right slots.
            await prisma.user.update({
                where: { userId: user.userId },
                data: {
                    bankName: '',
                    accountNumber: bankName.trim(),
                    ifscCode: accNo.trim()
                }
            });
            fixCount++;
        }
    }

    console.log(`--- Finished. Fixed ${fixCount} users. ---`);
}

fixData().catch(console.error).finally(() => prisma.$disconnect());
