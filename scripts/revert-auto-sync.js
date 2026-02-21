const { PrismaClient } = require('@prisma/client')
// Note: We'll manually implement a simple sync or call the server action if possible via node
// But since syncUserStats is a server action needing complex setup, we'll just update the counts here
// or use a more direct approach.

const prisma = new PrismaClient()

async function main() {
    console.log('--- STARTING AUTO_SYNC REVERSION (JS) ---')

    // 1. Find all leads with AUTO_SYNC
    const leads = await prisma.referralLead.findMany({
        where: { admissionNumber: 'AUTO_SYNC' }
    })

    console.log(`Found ${leads.length} leads to revert.`)

    const affectedUserIds = new Set()

    for (const lead of leads) {
        affectedUserIds.add(lead.userId)

        await prisma.referralLead.update({
            where: { leadId: lead.leadId },
            data: {
                leadStatus: 'New',
                admissionNumber: null,
                confirmedDate: null,
                studentName: null,
                annualFee: null,
                selectedFeeType: null,
                rejectionReason: 'Reverted from AUTO_SYNC'
            }
        })
        console.log(`Reverted Lead ID: ${lead.leadId} (User ID: ${lead.userId})`)
    }

    console.log('--- CLEANUP COMPLETE ---')
    console.log(`Affected User IDs: ${Array.from(affectedUserIds).join(', ')}`)
    console.log('Please run a manual sync for these users or trigger it via the UI.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
