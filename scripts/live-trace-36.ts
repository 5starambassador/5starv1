import { PrismaClient } from '@prisma/client'
import { resolveWhatsAppVariables, getReferralQuery } from '../src/lib/campaign-utils'

const p = new PrismaClient()

async function main() {
    console.log('--- LIVE TRACE FOR CAMPAIGN 36 ---')

    const campaign = await p.campaign.findUnique({ where: { id: 36 } }) as any
    if (!campaign) { console.error('Campaign 36 not found'); return }

    const mapping = campaign.waVariableMapping as Record<string, string>
    const templateName = campaign.waTemplateName
    const audience = campaign.targetAudience as any
    const type = audience?.type || 'REFERRALS'

    console.log('Mapping:', JSON.stringify(mapping))
    console.log('Type:', type)

    const waConfig = await p.whatsAppConfig.findFirst({ where: { templateName } })
    const requiredCount = waConfig?.requiredVariablesCount ?? 0
    console.log('Required variables:', requiredCount)

    // Fetch same sampleUser as the test action would
    const where = getReferralQuery(audience)
    const rl = await p.referralLead.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        include: { user: true }
    }) as any

    if (!rl) { console.error('No referral lead found for audience'); return }

    const rawAmbassadorName = rl.user?.fullName || ''
    const ambassadorName = (rawAmbassadorName.toLowerCase().includes('abson') || rawAmbassadorName.toLowerCase().includes('campus'))
        ? 'Achariya Ambassador' : rawAmbassadorName

    const sampleUser = {
        userId: 0,
        fullName: rl.parentName || 'Parent',
        visitorName: rl.parentName || 'Parent',
        studentName: rl.studentName || 'Student',
        mobileNumber: rl.parentMobile || rl.mobileNumber || '',
        assignedCampus: rl.campus || 'Global Campus',
        role: 'Referral',
        ambassadorName,
        referralCode: rl.user?.referralCode || '',
        referrerCode: rl.user?.referralCode || '',
        programInterested: rl.programInterested || '',
        programSlug: '',
        confirmedReferralCount: 0
    }

    console.log('\n--- sampleUser ---')
    console.log('fullName:', sampleUser.fullName)
    console.log('ambassadorName:', sampleUser.ambassadorName)
    console.log('referralCode:', sampleUser.referralCode)
    console.log('programInterested:', sampleUser.programInterested)

    console.log('\n--- resolveWhatsAppVariables ---')
    const { waVars } = await resolveWhatsAppVariables(sampleUser, type, mapping, requiredCount)

    console.log('Variable 1:', waVars[0])
    console.log('Variable 2:', waVars[1])
    console.log('Variable 3:', waVars[2])

    if (waVars[2]?.includes('wow-summer-camp')) {
        console.log('\n✅ SUCCESS: WOW Summer Camp link is correct!')
    } else {
        console.error('\n❌ FAIL: Variable 3 is wrong:', waVars[2])
    }
}

main().catch(console.error).finally(() => p.$disconnect())
