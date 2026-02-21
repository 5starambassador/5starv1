
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function audit() {
    console.log('--- STARTING PRECISION REFERRAL SYNC AUDIT ---')

    const users = await prisma.user.findMany({
        include: { referrals: true }
    })

    const shortTermSlabs: Record<number, number> = { 1: 5, 2: 10, 3: 20, 4: 30, 5: 50 };
    const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

    const inconsistencies = []
    const actualNullData = []
    const zeroFeeLeads = []

    for (const user of users) {
        const confirmedLeads = user.referrals.filter(r => r.leadStatus === 'Confirmed')
        const currentYearConfirmed = confirmedLeads.filter(r => r.confirmedDate && new Date(r.confirmedDate) >= currentYearStart)

        const lifetimeCount = confirmedLeads.length
        const currentYearCount = currentYearConfirmed.length

        // Recalculate Benefits
        const lookupCount = Math.min(currentYearCount, 5)
        let expectedYearFeeBenefit = shortTermSlabs[lookupCount] || 0

        let longTermTotal = 0
        if (user.isFiveStarMember) {
            const priorYearCount = lifetimeCount - currentYearCount
            if (currentYearCount >= 1) {
                const cumulativeBase = priorYearCount * 3
                const currentYearBoost = currentYearCount * 5
                longTermTotal = cumulativeBase + currentYearBoost
                if (longTermTotal > expectedYearFeeBenefit) {
                    expectedYearFeeBenefit = longTermTotal
                }
            }
        }

        // Check for inconsistencies
        const hasCountError = user.confirmedReferralCount !== lifetimeCount
        const hasPercentError = Math.abs(user.yearFeeBenefitPercent - expectedYearFeeBenefit) > 0.01

        if (hasCountError || hasPercentError) {
            inconsistencies.push({
                userId: user.userId,
                fullName: user.fullName,
                storedCount: user.confirmedReferralCount,
                actualCount: lifetimeCount,
                storedPercent: user.yearFeeBenefitPercent,
                expectedPercent: expectedYearFeeBenefit
            })
        }

        // Check for Finance Data
        for (const lead of confirmedLeads) {
            const isAnnualNull = lead.annualFee === null
            const isAdmNull = lead.admissionFeeCollected === null
            const isDonNull = lead.donationFeeCollected === null

            if (isAnnualNull || isAdmNull || isDonNull) {
                actualNullData.push({
                    leadId: lead.leadId,
                    studentName: lead.studentName,
                    userId: user.userId,
                    annualFee: lead.annualFee,
                    admFee: lead.admissionFeeCollected,
                    donFee: lead.donationFeeCollected
                })
            }

            if (lead.annualFee === 0) {
                zeroFeeLeads.push({
                    leadId: lead.leadId,
                    studentName: lead.studentName,
                    userId: user.userId
                })
            }
        }
    }

    const results = {
        timestamp: new Date().toISOString(),
        inconsistentAmbassadors: inconsistencies.length,
        inconsistencies,
        leadsWithNullData: actualNullData.length,
        actualNullData,
        leadsWithZeroAnnualFee: zeroFeeLeads.length,
        zeroFeeLeads
    }

    fs.writeFileSync('audit-results.json', JSON.stringify(results, null, 2))
    console.log(`\nAudit complete. Results saved to audit-results.json`)
    console.log(`Ambassadors with sync errors: ${inconsistencies.length}`)
    console.log(`Leads with actual NULL data: ${actualNullData.length}`)
    console.log(`Leads with 0 annual fee (verified defaults): ${zeroFeeLeads.length}`)
}

audit().catch(console.error).finally(() => prisma.$disconnect())
