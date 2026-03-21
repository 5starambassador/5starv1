import { PrismaClient } from '@prisma/client'
import { getAmbassadorQuery } from '../src/lib/campaign-utils'

const prisma = new PrismaClient()

async function audit() {
    console.log('🚀 Starting Comprehensive Campaign Filter Audit...\n')

    const configurations = [
        { label: '0 Referrals (No activity)', referralMilestone: '0' },
        { label: '1 Referral', referralMilestone: '1' },
        { label: '2 Referrals', referralMilestone: '2' },
        { label: '3 Referrals', referralMilestone: '3' },
        { label: '4 Referrals', referralMilestone: '4' },
        { label: '5+ Referrals', referralMilestone: '5+' },
        { label: 'Active Only', accountHealth: 'Active' },
        { label: 'Inactive Only', accountHealth: 'Inactive' },
        { label: 'Missing Bank Details', missingInfo: 'bankDetails' },
        { label: 'Missing Child Details (Parents)', missingInfo: 'childDetails' },
        { label: 'Funnel: Submitted not Confirmed', leadFunnelStatus: 'hasSubmittedNotConfirmed' },
        { label: 'Funnel: Has Pending Leads', leadFunnelStatus: 'hasPendingLeads' },
        { label: 'Funnel: Has Visited Leads', leadFunnelStatus: 'hasVisitedLeads' },
        { label: 'Funnel: Has No Leads', leadFunnelStatus: 'hasNoLeads' },
    ]

    const results: any[] = []

    for (const config of configurations) {
        const query = getAmbassadorQuery({
            role: 'All',
            campus: 'All',
            activityStatus: 'All',
            ...config
        } as any)

        const count = await prisma.user.count({ where: query as any })
        results.push({ Filter: config.label, Count: count })
    }

    console.table(results)

    // Cross-check 5901 for "Active Only" + "0 Referrals"
    const specificQuery = getAmbassadorQuery({
        role: 'All',
        campus: 'All',
        activityStatus: 'All',
        accountHealth: 'Active',
        referralMilestone: '0'
    } as any)
    const specificCount = await prisma.user.count({ where: specificQuery as any })
    console.log(`\n🔍 Cross-check: [Active Only] + [0 Referrals] = ${specificCount}`)
    if (specificCount === 5901) {
        console.log('✅ MATCH: 5901 profiles confirmed for the highlighted case.')
    } else {
        console.log(`⚠️ MISMATCH: Current count is ${specificCount}, expected ~5901.`)
    }

    await prisma.$disconnect()
}

audit().catch(err => {
    console.error(err)
    process.exit(1)
})
