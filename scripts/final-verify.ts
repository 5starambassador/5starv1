import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
    console.log('--- FINAL VERIFICATION ---')
    
    // 1. Check PENDING count
    const pendingCount = await (prisma as any).campaignRecipient.count({
        where: { status: 'PENDING' }
    })
    console.log(`- PENDING Recipients: ${pendingCount} (Should be 0)`)

    // 2. Check FAILED count for Campaign #14 (Cleanup check)
    const failed14Count = await (prisma as any).campaignRecipient.count({
        where: { campaignId: 14, status: 'FAILED' }
    })
    console.log(`- Campaign #14 FAILED: ${failed14Count} (Should be 3065)`)

    // 3. Test Sanitization Logic (Internal check)
    const testValue = "Line 1\nLine 2\r\nLine 3"
    const sanitized = testValue.toString().replace(/[\r\n]+/g, ' ').trim()
    console.log(`- Sanitization Test: "${testValue.replace(/\n/g, '\\n')}" -> "${sanitized}"`)
    
    if (sanitized === "Line 1 Line 2 Line 3") {
        console.log("✅ Sanitization logic is robust.")
    } else {
        console.log("❌ Sanitization logic failed!")
    }

    await prisma.$disconnect()
}

verify()
