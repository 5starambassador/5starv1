import { PrismaClient } from '@prisma/client'
import { syncUserStats } from '../src/app/sync-actions'

const prisma = new PrismaClient()

async function main() {
    console.log('--- STARTING AUTO_SYNC REVERSION ---')

    // 1. Find all leads with AUTO_SYNC
    const leads = await prisma.referralLead.findMany({
        where: { admissionNumber: 'AUTO_SYNC' }
    })

    console.log(`Found ${leads.length} leads to revert.`)

    const affectedUserIds = new Set<number>()

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
            } as any
        })
        console.log(`Reverted Lead ID: ${lead.leadId} (User ID: ${lead.userId})`)
    }

    console.log('--- RE-SYNCING USER STATS ---')

    for (const userId of affectedUserIds) {
        console.log(`Syncing User ID: ${userId}...`)
        await syncUserStats(userId)
    }

    console.log('--- CLEANUP COMPLETE ---')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
