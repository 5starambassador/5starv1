import prisma from '../lib/prisma'

const EXCLUDED_FROM_SLAB = ['ACET', 'AASC', 'ACCHM'];
const defaultSlabs: Record<number, number> = { 0: 0, 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 };

async function fixCounts() {
    console.log('🚀 Starting Direct Count Fix...')

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { confirmedReferralCount: { gt: 0 } },
                    { referrals: { some: { leadStatus: { in: ['Confirmed', 'Admitted'] } } } }
                ]
            },
            select: { userId: true, fullName: true, confirmedReferralCount: true }
        })

        console.log(`🔍 Processing ${users.length} users...`)

        let updatedCount = 0
        for (const user of users) {
            const confirmedLeadsCount = await prisma.referralLead.count({
                where: {
                    userId: user.userId,
                    leadStatus: { in: ['Confirmed', 'Admitted'] },
                    campus: { notIn: EXCLUDED_FROM_SLAB }
                }
            })

            const lookupCount = Math.min(confirmedLeadsCount, 5)
            const slab = await prisma.benefitSlab.findFirst({
                where: { referralCount: lookupCount }
            })
            const slabBenefit = slab ? slab.yearFeeBenefitPercent : (defaultSlabs[lookupCount] || 0)

            if (user.confirmedReferralCount !== confirmedLeadsCount) {
                await prisma.user.update({
                    where: { userId: user.userId },
                    data: {
                        confirmedReferralCount: confirmedLeadsCount,
                        yearFeeBenefitPercent: slabBenefit
                    }
                })
                console.log(`✅ Updated ${user.fullName}: ${user.confirmedReferralCount} -> ${confirmedLeadsCount}`)
                updatedCount++
            }
        }

        console.log(`\n✨ Done! Updated ${updatedCount} users.`)

    } catch (error) {
        console.error('❌ Fix failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

fixCounts()
