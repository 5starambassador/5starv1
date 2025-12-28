import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🚧 Starting Campus Admin Flow Verification...')

    const studentName = 'Little Champ'
    const testReferralMobile = '8888888888'

    // 1. Fetch the Referral created in previous step
    console.log(`🔍 Fetching Referral for ${studentName}...`)
    const lead = await prisma.referralLead.findFirst({
        where: {
            studentName: studentName,
            parentMobile: testReferralMobile
        },
        include: { user: true }
    })

    if (!lead) throw new Error('Referral Lead not found. Run verify-ambassador-flow.ts first.')
    console.log(`✅ Found Lead ID: ${lead.leadId}, Current Status: ${lead.leadStatus}`)

    // 2. Simulate confirmCampusReferral Logic
    console.log('✍️ Simulating Campus Admin Confirmation...')

    // Update Lead Status
    await prisma.referralLead.update({
        where: { leadId: lead.leadId },
        data: {
            leadStatus: 'Confirmed',
            confirmedDate: new Date()
        }
    })

    // Update User Counts & Benefits (Logic Mirror)
    const userId = lead.userId
    const count = await prisma.referralLead.count({
        where: { userId, leadStatus: 'Confirmed' }
    })

    const slabs = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 }
    // @ts-ignore
    const yearFeeBenefit = slabs[Math.min(count, 5)] || 0

    await prisma.user.update({
        where: { userId },
        data: {
            confirmedReferralCount: count,
            yearFeeBenefitPercent: yearFeeBenefit,
            benefitStatus: count >= 1 ? 'Active' : 'Inactive'
        }
    })
    console.log(`✅ Lead Confirmed. Updated User Benefit to ${yearFeeBenefit}%`)

    // 3. Verification
    console.log('🔍 Verifying Data Integrity...')

    const updatedLead = await prisma.referralLead.findUnique({
        where: { leadId: lead.leadId }
    })

    const updatedUser = await prisma.user.findUnique({
        where: { userId: lead.userId }
    })

    if (updatedLead?.leadStatus !== 'Confirmed') throw new Error('Lead Status not updated')
    if (updatedLead?.confirmedDate === null) throw new Error('Confirmed Date not set')

    if (updatedUser?.confirmedReferralCount !== 1) throw new Error('User Confirmed Count mismatch')
    if (updatedUser?.yearFeeBenefitPercent !== 5) throw new Error('Benefit Percent mismatch (Expected 5% for 1 referral)')
    if (updatedUser?.benefitStatus !== 'Active') throw new Error('Benefit Status not Active')

    console.log('🎉 Verification Successful! Lead Confirmed and Benefits Applied.')
}

main()
    .catch((e) => {
        console.error('❌ Verification Failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
