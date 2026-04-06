import prisma from '../src/lib/prisma'

async function main() {
    const campaigns = await prisma.campaign.findMany({
        orderBy: { id: 'asc' },
        select: { 
            id: true, name: true, status: true, 
            targetAudience: true, channels: true,
            logs: { select: { sentCount: true, status: true }, orderBy: { runAt: 'desc' }, take: 1 }
        }
    })

    console.log(`\n${'='.repeat(80)}`)
    console.log(`FULL CAMPAIGN AUDIENCE AUDIT — ${new Date().toLocaleString('en-IN')}`)
    console.log(`${'='.repeat(80)}\n`)
    console.log(`Total Campaigns: ${campaigns.length}\n`)

    const issues: string[] = []

    for (const c of campaigns) {
        const a = c.targetAudience as any || {}
        const type = a.type || 'AMBASSADORS'
        const log = (c.logs as any[])[0]

        console.log(`[#${c.id}] ${c.name}`)
        console.log(`  Status  : ${c.status}`)
        console.log(`  Channels: ${(c.channels as string[]).join(', ')}`)
        console.log(`  Type    : ${type}`)
        console.log(`  Campus  : ${a.campus || '(none set)'}`)

        // Type-specific filters
        if (type === 'AMBASSADORS' || !a.type) {
            console.log(`  Role           : ${a.role || '(none)'}`)
            console.log(`  Account Health : ${a.accountHealth || '(none)'}`)
            console.log(`  Activity Status: ${a.activityStatus || '(none)'}`)
            console.log(`  Ref Milestone  : ${a.referralMilestone || '(none)'}`)
            console.log(`  Funnel Status  : ${a.leadFunnelStatus || '(none)'}`)
            console.log(`  Missing Info   : ${a.missingInfo || '(none)'}`)
            
            // Check for old campaigns missing modern fields
            if (!a.type) issues.push(`#${c.id} "${c.name}" — missing 'type' field (old format, defaults to AMBASSADORS)`)
            if (a.accountHealth === undefined) issues.push(`#${c.id} "${c.name}" — missing 'accountHealth' (may target inactive users)`)
        }

        if (type === 'REFERRALS') {
            console.log(`  Lead Status    : ${a.leadStatus || '(ALL - no filter)'}`)
            if (!a.leadStatus || a.leadStatus === 'All') {
                issues.push(`#${c.id} "${c.name}" — REFERRALS with no leadStatus filter (sends to ALL referrals regardless of stage)`)
            }
        }

        if (type === 'PROGRAM_LEADS') {
            console.log(`  Program Status : ${a.programLeadStatus || '(ALL - no filter)'}`)
        }

        if (log) {
            console.log(`  Last Run       : Sent=${log.sentCount}, Status=${log.status}`)
        } else {
            console.log(`  Last Run       : Never dispatched`)
        }
        console.log()
    }

    console.log(`${'='.repeat(80)}`)
    console.log(`ISSUES FOUND: ${issues.length}`)
    console.log(`${'='.repeat(80)}`)
    if (issues.length === 0) {
        console.log('✅ No issues found. All campaigns are correctly configured.')
    } else {
        issues.forEach((issue, i) => console.log(`⚠️  ${i + 1}. ${issue}`))
    }
    console.log()

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
