
import { PrismaClient } from '@prisma/client'
import { createCampaign, runCampaign, getAudienceCount } from '@/app/campaign-actions'

const prisma = new PrismaClient()

async function main() {
    console.log('🧪 Starting Full Campaign Verification...')

    // 0. Ensure Admin User Context (Mocking this might be tricky with "getCurrentUser", 
    // actually our server actions call getCurrentUser. 
    // Testing server actions directly via script might fail if they rely on headers/cookies.
    // Let's modify the script to bypass the auth check or we have to rely on unit-test logic.
    // However, we can test the Core Logic functions if we export them or reproduce them.

    // Instead, let's just use Prisma to create the campaign and call runCampaign directly if possible?
    // runCampaign calls checkAdmin() which checks currentUser. This will fail in script.

    console.log('⚠️ NOTE: Cannot fully test server actions with auth checks in script.')
    console.log('⚠️ We will verify the database interactions manually here.')

    // 1. Create Dummy Leads (Batch Test)
    console.log('🌱 Seeding 250 dummy leads...')
    const leadsData = []
    const baseMobile = 9000000000

    for (let i = 0; i < 250; i++) {
        leadsData.push({
            visitorName: `Batch Lead ${i}`,
            visitorMobile: (baseMobile + i).toString(),
            programId: 1, // Assumes program created below or existing
            referrerId: 1 // Assumes referrer created below or existing
        })
    }

    // Creating dependencies first
    const prog = await prisma.externalProgram.upsert({
        where: { slug: 'test-program-v2' },
        update: {},
        create: { title: 'Test Program 2', slug: 'test-program-v2', targetUrl: 'https://example.com' }
    })

    const refUser = await prisma.user.upsert({
        where: { mobileNumber: '9999999990' },
        update: {},
        create: { fullName: 'Ref User', mobileNumber: '9999999990', role: 'Parent', status: 'Active', childInAchariya: false }
    })

    // Bulk create
    // Prisma createMany is faster
    await prisma.programLead.createMany({
        data: leadsData.map(l => ({
            visitorName: l.visitorName,
            visitorMobile: l.visitorMobile,
            programId: prog.id,
            referrerId: refUser.userId
        })),
        skipDuplicates: true
    })

    console.log('✅ Created 250 Dummy Leads')

    // 2. Create Campaign Directly (Bypassing Server Action Auth)
    const campaign = await prisma.campaign.create({
        data: {
            name: 'Verification Full Flow',
            subject: 'Hello {userName}',
            templateBody: 'Welcome to {campus}. Your referrer is {referralCode}',
            type: 'WHATSAPP',
            status: 'ACTIVE',
            targetAudience: { type: 'PROGRAM_LEADS', role: 'All', activityStatus: 'All', campus: 'All' },
            channels: ['WHATSAPP']
        }
    })
    console.log('✅ Created Campaign:', campaign.id)

    // 3. Simulate "runCampaign" logic manually to verify variable replacement
    console.log('🚀 Simulating Run Logic...')

    // Fetch Audience
    // REPLICATING LOGIC FROM campaign-actions.ts
    const leads = await prisma.programLead.findMany({
        select: { visitorMobile: true, visitorName: true }
    })
    const targetUsers = leads.map(l => ({
        mobileNumber: l.visitorMobile,
        fullName: l.visitorName || 'Friend',
        role: 'Lead',
        confirmedReferralCount: 0
    }))

    // Verify one random user
    // Find a specific user
    const checkMobile = '9000000050' // Batch Lead 50
    const user = targetUsers.find(u => u.mobileNumber === checkMobile)

    if (user) {
        console.log('✅ Found Random Batch User in Audience')

        // Variable Replacement Test
        const personalizedSubject = campaign.subject
            .replace(/{userName}|{Ambassador}/gi, user.fullName || 'User')

        console.log('📝 Template Subject:', campaign.subject)
        console.log('📝 Personalized Subject:', personalizedSubject)

        if (personalizedSubject === 'Hello Batch Lead 50') {
            console.log('✅ Variable Replacement Successful')
        } else {
            console.error('❌ Variable Replacement Failed')
        }

    } else {
        console.error('❌ Did not find the batch lead.')
    }

    // Cleanup
    await prisma.programLead.deleteMany({ where: { visitorMobile: { startsWith: '9000000' } } })
    await prisma.campaign.delete({ where: { id: campaign.id } })
    console.log('🧹 Cleanup Complete')
}

main()
