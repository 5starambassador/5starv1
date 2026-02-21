import { importAmbassadors } from '../app/import-actions'
import prisma from '../lib/prisma'

async function verifyParity() {
    console.log('🚀 Starting Export-Import Parity Verification...')

    const testMobile = '9999999999'

    try {
        // 1. Cleanup existing if any
        await prisma.user.deleteMany({ where: { mobileNumber: testMobile } })

        // 2. Simulate a CSV row with all supported fields
        // Full Name,Mobile Number,Role,Email,Assigned Campus,Emp ID,Child ERP No,Academic Year,Password,Referral Code,Child In Achariya,Benefit Status,Aadhar No,Address,Bank Name,Account Number,IFSC Code
        const csvContent = `Full Name,Mobile Number,Role,Email,Assigned Campus,Emp ID,Child ERP No,Academic Year,Password,Referral Code,Child In Achariya,Benefit Status,Aadhar No,Address,Bank Name,Account Number,IFSC Code
"Parity Test User","${testMobile}","Staff","test@parity.com","ASM - VILLIANUR","EMP_PARITY","ERP_PARITY","2025-2026","Secret123","CODE_PARITY","Yes","Active","123456789012","123 Parity St","Parity Bank","9988776655","PARI0001"`

        console.log('📥 Importing CSV data...')
        const result = await importAmbassadors(csvContent)

        if (!result.success) {
            console.error('❌ Import failed:', result.error, result.errors)
            return
        }
        console.log(`✅ Processed ${result.processed} records.`)

        // 3. Verify in Database
        console.log('🔍 Verifying database record...')
        const user = await prisma.user.findUnique({ where: { mobileNumber: testMobile } })

        if (!user) {
            console.error('❌ User not found in database!')
            return
        }

        const checks = [
            { field: 'fullName', expected: 'Parity Test User', actual: user.fullName },
            { field: 'email', expected: 'test@parity.com', actual: user.email },
            { field: 'assignedCampus', expected: 'ASM - VILLIANUR', actual: user.assignedCampus },
            { field: 'aadharNo', expected: '123456789012', actual: user.aadharNo },
            { field: 'address', expected: '123 Parity St', actual: user.address },
            { field: 'bankName', expected: 'Parity Bank', actual: user.bankName },
            { field: 'accountNumber', expected: '9988776655', actual: user.accountNumber },
            { field: 'ifscCode', expected: 'PARI0001', actual: user.ifscCode },
            { field: 'childEprNo', expected: 'ERP_PARITY', actual: user.childEprNo },
            { field: 'benefitStatus', expected: 'Active', actual: user.benefitStatus }
        ]

        let failed = 0
        checks.forEach(c => {
            if (c.actual === c.expected) {
                console.log(`  ✅ ${c.field}: Matches`)
            } else {
                console.error(`  ❌ ${c.field}: Mismatch! Expected "${c.expected}", Got "${c.actual}"`)
                failed++
            }
        })

        if (failed === 0) {
            console.log('\n✨ SUCCESS: Export-Import Parity Confirmed!')
        } else {
            console.error(`\n❌ FAILED: ${failed} fields did not match.`)
        }

    } catch (error) {
        console.error('❌ Verification script failed:', error)
    } finally {
        // Cleanup
        await prisma.user.deleteMany({ where: { mobileNumber: testMobile } })
        await prisma.$disconnect()
    }
}

verifyParity()
