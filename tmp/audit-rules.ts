import prisma from '../src/lib/prisma'

async function main() {
    // Safe: no include (no relation in schema)
    const rules = await prisma.automationRule.findMany({
        orderBy: { id: 'asc' }
    })

    console.log(`\n${'='.repeat(80)}`)
    console.log(`SMART RULES AUDIT — ${new Date().toLocaleString('en-IN')}`)
    console.log(`Total Rules: ${rules.length}`)
    console.log(`${'='.repeat(80)}\n`)

    const issues: string[] = []

    for (const rule of rules) {
        const c = (rule.conditions as any) || {}
        const dot = rule.isActive ? '🟢 ACTIVE' : '⚪ INACTIVE'

        // Get last log separately
        const lastLog = await prisma.automationLog.findFirst({
            where: { ruleId: rule.id },
            orderBy: { createdAt: 'desc' }
        })

        // Count total executions
        const totalRuns = await prisma.automationLog.count({ where: { ruleId: rule.id, status: 'SUCCESS' } })

        console.log(`[#${rule.id}] ${rule.name} — ${dot}`)
        console.log(`   Trigger     : ${rule.triggerType}`)
        console.log(`   Template    : ${rule.actionTarget || rule.triggerEvent || '(none)'}`)
        console.log(`   Target Type : ${c.targetEntity || 'USER/AMBASSADOR (default)'}`)
        console.log(`   Total Sent  : ${totalRuns}`)

        // ── Condition Details ──
        if (c.targetEntity === 'REFERRAL_LEAD') {
            console.log(`   Lead Status : ${c.leadStatuses?.join(', ') || '⚠️ ALL (no filter)'}`)
            console.log(`   Interval Day: ${c.intervalDay !== undefined ? `Day ${c.intervalDay}` : '⚠️ NONE (matches ALL time)'}`)
            console.log(`   Campus      : ${c.campus?.join(', ') || 'All'}`)

            if (!c.leadStatuses?.length) issues.push(`⚠️ #${rule.id} "${rule.name}" — REFERRAL_LEAD with NO leadStatus filter (sends to ALL referrals regardless of stage!)`)
            if (c.intervalDay === undefined) issues.push(`⚠️ #${rule.id} "${rule.name}" — No intervalDay (Day-N targeting missing — targets ALL referrals ever created)`)
        } else {
            // AMBASSADOR / USER checks
            console.log(`   Account Hlth: ${c.status?.join(', ') || '⚠️ ALL ACCOUNTS (includes inactive)'}`)
            console.log(`   Min Referrals: ${c.minReferrals ?? 'none'} | Max: ${c.maxReferrals ?? 'none'}`)
            console.log(`   Funnel Stage: ${c.leadFunnelStatus || 'All'}`)
            console.log(`   Interval Day: ${c.intervalDay !== undefined ? `Day ${c.intervalDay}` : 'none'}`)
            console.log(`   Campus      : ${c.campus?.join(', ') || 'All'}`)

            if (!c.status?.length) {
                issues.push(`⚠️ #${rule.id} "${rule.name}" — No Account Health filter set (may target Inactive/Unverified ambassadors!)`)
            }
        }

        if (lastLog) {
            console.log(`   Last Run    : ${lastLog.status} — ${lastLog.reason} (${new Date(lastLog.createdAt).toLocaleString('en-IN')})`)
        } else {
            console.log(`   Last Run    : Never executed`)
        }
        console.log()
    }

    console.log(`${'='.repeat(80)}`)
    console.log(`ISSUES FOUND: ${issues.length}`)
    console.log(`${'='.repeat(80)}`)
    if (issues.length === 0) {
        console.log('✅ All rules are correctly configured.')
    } else {
        issues.forEach(i => console.log(i))
    }

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
