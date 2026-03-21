const { PrismaClient, AccountStatus, LeadStatus } = require('@prisma/client')

const prisma = new PrismaClient()

// Simplified version of getAmbassadorQuery logic for node
function getQuery(audience) {
    const andClauses = []

    const health = audience.accountHealth || 'Active'
    if (health === 'Active') {
        andClauses.push({ status: 'Active' })
    } else if (health === 'Inactive') {
        andClauses.push({ status: { not: 'Active' } })
    }

    const milestone = audience.referralMilestone
    if (milestone && milestone !== 'All') {
        if (milestone === '0') {
            andClauses.push({ confirmedReferralCount: 0 })
        } else if (milestone === '1') {
            andClauses.push({ confirmedReferralCount: 1 })
        } else if (milestone === '2') {
            andClauses.push({ confirmedReferralCount: 2 })
        } else if (milestone === '3') {
            andClauses.push({ confirmedReferralCount: 3 })
        } else if (milestone === '4') {
            andClauses.push({ confirmedReferralCount: 4 })
        } else if (milestone === '5+') {
            andClauses.push({ confirmedReferralCount: { gte: 5 } })
        }
    }

    const missing = audience.missingInfo
    if (missing && missing !== 'None' && missing !== 'All') {
        if (missing === 'bankDetails') {
            andClauses.push({
                OR: [
                    { accountNumber: null },
                    { accountNumber: '' },
                    { ifscCode: null },
                    { ifscCode: '' }
                ]
            })
        } else if (missing === 'childDetails') {
            andClauses.push({ role: 'Parent' })
            andClauses.push({ students: { none: {} } })
        }
    }

    const funnel = audience.leadFunnelStatus
    if (funnel && funnel !== 'All') {
        if (funnel === 'hasSubmittedNotConfirmed') {
            andClauses.push({
                referrals: {
                    some: {},
                    none: { leadStatus: { in: ['Confirmed', 'Admitted'] } }
                }
            })
        } else if (funnel === 'hasPendingLeads') {
            andClauses.push({
                referrals: {
                    some: {
                        leadStatus: { in: ['New', 'Interested', 'Follow_up', 'Contacted'] }
                    }
                }
            })
        } else if (funnel === 'hasNoLeads') {
            andClauses.push({ referrals: { none: {} } })
        }
    }

    return andClauses.length > 0 ? { AND: andClauses } : {}
}

async function audit() {
    console.log('🚀 Starting Comprehensive Campaign Filter Audit (JS)...\n')

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
        { label: 'Funnel: Has No Leads', leadFunnelStatus: 'hasNoLeads' },
        { label: 'Active + 0 Referrals', accountHealth: 'Active', referralMilestone: '0' },
    ]

    const results = []

    for (const config of configurations) {
        const query = getQuery(config)
        const count = await prisma.user.count({ where: query })
        results.push({ Filter: config.label, Count: count })
    }

    console.table(results)

    await prisma.$disconnect()
}

audit().catch(err => {
    console.error(err)
    process.exit(1)
})
