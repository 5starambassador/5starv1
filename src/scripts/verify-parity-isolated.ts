import prisma from '../lib/prisma'

// --- Isolated Parser (Copied from import-actions.ts) ---
function parseCSV(csvText: string) {
    const cleanText = csvText.replace(/^\uFEFF/, '')
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
    return lines.slice(1).map(line => {
        const values: string[] = []
        let inQuotes = false
        let currentValue = ''
        for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') inQuotes = !inQuotes
            else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim())
                currentValue = ''
            } else {
                currentValue += char
            }
        }
        values.push(currentValue.trim())
        const row: any = {}
        headers.forEach((h, i) => {
            let value = values[i] || ''
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
            row[h] = value
        })
        return row
    })
}

async function verifyIsolated() {
    console.log('🚀 Starting Isolated Parity Verification...')
    const testMobile = '9999999999'

    try {
        await prisma.user.deleteMany({ where: { mobileNumber: testMobile } })

        const csvContent = `Full Name,Mobile Number,Role,Email,Assigned Campus,Emp ID,Child ERP No,Academic Year,Password,Referral Code,Child In Achariya,Benefit Status,Aadhar No,Address,Bank Name,Account Number,IFSC Code
"Parity Test User","${testMobile}","Staff","test@parity.com","ASM - VILLIANUR","EMP_PARITY","ERP_PARITY","2025-2026","Secret123","CODE_PARITY","Yes","Active","123456789012","123 Parity St","Parity Bank","9988776655","PARI0001"`

        const rows = parseCSV(csvContent)
        const row = rows[0]

        // --- Simulated Mapping (Same as in import-actions.ts) ---
        const fullName = row.fullname || row['full name']
        const mobileNumber = row.mobilenumber || row['mobile number']
        const role = 'Staff'
        const email = row.email || row['email'] || null
        const assignedCampus = row.assignedcampus || row['assigned campus'] || row['campus name'] || row['campus'] || null
        const aadharNo = row.aadharno || row['aadhar no'] || null
        const address = row.address || row['address'] || null
        const bankName = row.bankname || row['bank name'] || null
        const accountNumber = row.accountnumber || row['account number'] || null
        const ifscCode = row.ifsccode || row['ifsc code'] || null
        const childEprNo = row.childeprno || row['child erp no'] || row['erp no'] || null
        const benefitStatus = 'Active'

        const userData = {
            fullName,
            mobileNumber,
            role,
            email,
            assignedCampus,
            aadharNo,
            address,
            bankName,
            accountNumber,
            ifscCode,
            childEprNo,
            benefitStatus: benefitStatus as any,
            referralCode: 'CODE_PARITY',
            academicYear: '2025-2026',
            childInAchariya: true // Required field
        }

        console.log('📥 Upserting data into DB...')
        await (prisma.user as any).upsert({
            where: { mobileNumber },
            update: userData,
            create: userData
        })

        console.log('🔍 Verifying database record...')
        const user = await prisma.user.findUnique({ where: { mobileNumber: testMobile } })
        if (!user) throw new Error('User not found!')

        const checks = [
            { field: 'fullName', expected: 'Parity Test User', actual: user.fullName },
            { field: 'assignedCampus', expected: 'ASM - VILLIANUR', actual: user.assignedCampus },
            { field: 'aadharNo', expected: '123456789012', actual: user.aadharNo },
            { field: 'bankName', expected: 'Parity Bank', actual: user.bankName },
            { field: 'accountNumber', expected: '9988776655', actual: user.accountNumber }
        ]

        let failed = 0
        checks.forEach(c => {
            if (c.actual === c.expected) console.log(`  ✅ ${c.field}: Matches`)
            else { console.error(`  ❌ ${c.field}: Mismatch!`); failed++ }
        })

        if (failed === 0) console.log('\n✨ SUCCESS: Parity Logic Verified!')
        else console.error(`\n❌ FAILED: ${failed} mismatches.`)

    } catch (error) {
        console.error('❌ Script failed:', error)
    } finally {
        await prisma.user.deleteMany({ where: { mobileNumber: testMobile } })
        await prisma.$disconnect()
    }
}

verifyIsolated()
