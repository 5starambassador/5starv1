const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Simplified syncUserStats for standalone script
 */
async function syncUser(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { referrals: true, students: true }
        })

        if (!user) return

        const studentRecords = await prisma.student.findMany({
            where: {
                parentId: user.userId,
                status: 'Active'
            }
        })
        const hasKids = studentRecords.length > 0

        const confirmedLeadsCount = await prisma.referralLead.count({
            where: {
                userId: user.userId,
                leadStatus: { in: ['Confirmed', 'Admitted'] }
            }
        })

        const lookupCount = Math.min(confirmedLeadsCount, 5)
        const slab = await prisma.benefitSlab.findFirst({
            where: { referralCount: lookupCount }
        })

        const defaultSlabs = { 0: 0, 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 }
        const slabBenefit = slab ? slab.yearFeeBenefitPercent : (defaultSlabs[lookupCount] || 0)

        const updatedUserDetails = {
            confirmedReferralCount: confirmedLeadsCount,
            yearFeeBenefitPercent: slabBenefit,
            benefitStatus: confirmedLeadsCount > 0 ? 'Active' : (hasKids ? 'Active' : user.benefitStatus)
        }

        await prisma.user.update({
            where: { userId: user.userId },
            data: updatedUserDetails
        })
        console.log(`Synced User ID: ${userId} (Confirmed Count: ${confirmedLeadsCount}, Benefit: ${slabBenefit}%)`)

    } catch (error) {
        console.error(`Error syncing user ${userId}:`, error.message)
    }
}

async function main() {
    console.log('--- STARTING RE-SYNC FOR AFFECTED USERS ---')

    // Find users who have reverted leads
    const leads = await prisma.referralLead.findMany({
        where: { rejectionReason: 'Reverted from AUTO_SYNC' },
        select: { userId: true }
    })

    const userIds = Array.from(new Set(leads.map(l => l.userId)))
    console.log(`Found ${userIds.length} unique users to re-sync.`)

    for (const userId of userIds) {
        await syncUser(userId)
    }

    console.log('--- ALL USERS SYNCED ---')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
