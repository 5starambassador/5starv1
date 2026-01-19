'use server'

import prisma from '@/lib/prisma'
import { EmailService } from '@/lib/email-service'
import { calculateStars } from '@/lib/gamification'
import { logger } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth-service'

// Helper to check if user is admin
async function checkAdmin() {
    const user = await getCurrentUser()
    if (!user || user.role === 'Parent' || user.role === 'Staff' || user.role === 'Alumni' || user.role === 'Others') {
        throw new Error('Unauthorized: Admin access required')
    }
    return user
}

/**
 * Triggers a re-engagement campaign for ambassadors inactive for 14+ days.
 * Only callable by Super Admins.
 */
export async function triggerReengagementCampaign() {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized: Super Admin access required' }
    }

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    try {
        // 1. Find all ambassadors (Staff, Alumni, Parent)
        const ambassadors = await prisma.user.findMany({
            where: {
                role: { in: ['Staff', 'Alumni', 'Parent'] },
                status: 'Active',
                email: { not: null }
            },
            include: {
                referrals: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        })

        const inactiveAmbassadors = ambassadors.filter(amb => {
            // No referrals at all or latest referral is > 14 days old
            const lastReferral = amb.referrals[0]
            if (!lastReferral) return true
            return new Date(lastReferral.createdAt) < fourteenDaysAgo
        })

        let sentCount = 0
        for (const amb of inactiveAmbassadors) {
            // 2. Check if we sent email in last 30 days
            const lastEmailLog = await prisma.activityLog.findFirst({
                where: {
                    action: 'REENGAGEMENT_EMAIL_SENT',
                    targetId: amb.userId.toString(),
                    createdAt: { gte: thirtyDaysAgo }
                }
            })

            if (!lastEmailLog && amb.email) {
                const stars = calculateStars(amb.confirmedReferralCount)
                await EmailService.sendReengagementEmail(amb.email, amb.fullName, stars.tier)

                // 3. Log the action
                await prisma.activityLog.create({
                    data: {
                        userId: admin.userId,
                        action: 'REENGAGEMENT_EMAIL_SENT',
                        module: 'engagement',
                        targetId: amb.userId.toString(),
                        description: `Sent re-engagement email to ambassador ${amb.fullName}`,
                        metadata: { count: amb.confirmedReferralCount, tier: stars.tier } as any
                    } as any
                })
                sentCount++
            }
        }

        return { success: true, sentCount }
    } catch (error) {
        logger.error('Failed to trigger re-engagement campaign:', error)
        return { success: false, error: 'Campaign execution failed' }
    }
}

export async function getEngagementStats() {
    try {
        await checkAdmin()

        const [campaignCount, totalSentResult, dormantCount] = await Promise.all([
            prisma.campaign.count(),
            prisma.campaignLog.aggregate({ _sum: { sentCount: true } }),
            prisma.user.count({
                where: {
                    status: 'Active',
                    role: { in: ['Staff', 'Alumni', 'Parent'] },
                    referrals: {
                        none: {
                            createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
                        }
                    }
                }
            })
        ])

        return {
            success: true,
            stats: {
                totalCampaigns: campaignCount,
                totalEmailsSent: totalSentResult._sum.sentCount || 0,
                dormantAmbassadors: dormantCount
            }
        }
    } catch (error) {
        return { success: false, error: 'Failed to fetch engagement stats' }
    }
}
