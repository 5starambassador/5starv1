
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🧪 Starting Audience Verification...')

    // 0. Fetch existing user for referrer
    const existingUser = await prisma.user.findFirst()
    if (!existingUser) {
        console.error('❌ NO USERS FOUND. Cannot create Program Lead without Referrer.')
        return
    }
    console.log('User found for referral:', existingUser.userId)

    // 1. Create Dummy Program Lead
    const lead = await prisma.programLead.create({
        data: {
            program: { connectOrCreate: { where: { slug: 'test-program-v1' }, create: { title: 'Test Program', slug: 'test-program-v1', targetUrl: 'https://example.com' } } },
            referrer: { connect: { userId: existingUser.userId } },
            visitorName: 'Test Verify Lead',
            visitorMobile: '9999999999'
        }
    })
    console.log('✅ Created Dummy Lead:', lead.id)

    // 2. Simulate Backend Logic for PROGRAM_LEADS
    console.log('🚀 Verifying Fetch Logic (PROGRAM_LEADS)...')

    // Logic copied from campaign-dispatcher.ts
    const leads = await prisma.programLead.findMany({
        where: {},
        select: {
            visitorName: true,
            visitorMobile: true,
            program: { select: { title: true } }
        }
    })

    // Map to standard User structure (mock check)
    const mappedUsers = leads.map(l => ({
        fullName: l.visitorName || 'Friend',
        mobileNumber: l.visitorMobile,
        role: 'Lead'
    }))

    console.log(`📊 Found ${leads.length} leads in total.`)
    const found = mappedUsers.find(l => l.mobileNumber === '9999999999')

    if (found) {
        console.log('✅ SUCCESS: Logic correctly identified the new lead.')
        console.log('   - Name:', found.fullName)
        console.log('   - Role:', found.role)
    } else {
        console.error('❌ FAILURE: Did not find the lead using the dispatcher logic.')
    }

    // Cleanup
    await prisma.programLead.deleteMany({ where: { visitorMobile: '9999999999' } })
    console.log('🧹 Cleanup Complete')
}

main()
