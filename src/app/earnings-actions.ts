'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { calculateTotalBenefit } from '@/lib/benefit-calculator'
import { getMyReferrals } from './referral-actions'
import { getBenefitSlabs } from './benefit-actions'

export async function getMyEarningsStats(academicYear?: string): Promise<{
    success: true,
    data: {
        totalEarned: number;
        referralYield: number;
        bonusCredits: number;
        refundAmount: number;
        totalSettled: number;
        pendingSettlement: number;
        remainingBalance: number;
        settlements: any[];
        breakdown: string[];
        referralCount: number;
    }
} | { success: false, error: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const [referrals, slabsData] = await Promise.all([
            getMyReferrals(),
            getBenefitSlabs()
        ])

        const yearFilter = academicYear || '2026-2027' // Default

        // 1. Fetch AcademicYear record for date boundaries
        const [activeYears, yearRecord] = await Promise.all([
            prisma.academicYear.findMany({
                where: { isActive: true },
                orderBy: { year: 'desc' }
            }),
            prisma.academicYear.findUnique({
                where: { year: yearFilter }
            })
        ])

        const currentYearObj = activeYears.find(y => y.isCurrent)
        const currentYear = academicYear === 'All Time' ? (currentYearObj?.year || '2026-2027') : yearFilter

        // Filtering logic for referrals
        const dateRangeFilter = yearRecord ? {
            createdAt: {
                gte: yearRecord.startDate,
                lte: yearRecord.endDate
            }
        } : null

        // Filter referrals for selected year / cycle
        const currentReferrals = academicYear === 'All Time'
            ? referrals
            : referrals.filter((r: any) => {
                const rYear = r.admittedYear || r.student?.academicYear
                if (rYear) return rYear === yearFilter

                if (dateRangeFilter) {
                    const date = new Date(r.createdAt)
                    return date >= yearRecord!.startDate && date <= yearRecord!.endDate
                }

                // Fallback
                const date = new Date(r.createdAt)
                return date >= new Date('2025-01-01')
            })

        // Fetch Settlements
        const settlementWhere: any = { userId: user.userId }
        if (academicYear !== 'All Time' && yearRecord) {
            settlementWhere.createdAt = {
                gte: yearRecord.startDate,
                lte: yearRecord.endDate
            }
        }

        const settlements = await prisma.settlement.findMany({
            where: settlementWhere,
            orderBy: { createdAt: 'desc' }
        })

        // Calculate Benefits using the official calculator
        // We'll use a simplified context here, matching what DashboardClient does
        const slabs = slabsData.data || []

        // Prepare context for calculator
        const { getDynamicFeeForUser } = await import('./referral-actions')
        const dynamicFee = await getDynamicFeeForUser()

        const context = {
            role: user.role as any,
            childInAchariya: (user as any).childInAchariya,
            studentFee: dynamicFee || (user as any).studentFee || 60000,
            isFiveStarLastYear: (user as any).isFiveStarMember,
            previousYearReferrals: [] // For now, we scale this if needed
        }

        // Fetch Grade-1 fees for the current cycle to enable slab rewards (Group B)
        const gradeFees = await prisma.gradeFee.findMany({
            where: {
                grade: { in: ['Grade - 1', 'Grade-1', 'Grade 1'] },
                academicYear: currentYear
            }
        })

        const grade1FeeMap = new Map()
        gradeFees.forEach(gf => {
            grade1FeeMap.set(gf.campusId, gf.annualFee_wotp || gf.annualFee_otp || 0)
        })

        const { getSpecialBonusRate } = await import('@/lib/reward-constants')

        // Format referrals for calculator
        const formattedReferrals = currentReferrals
            .filter((r: any) => r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted')
            .map((r: any) => {
                const g1Fee = grade1FeeMap.get(r.campusId)
                return {
                    id: r.leadId,
                    campusId: r.campusId || 0,
                    campusName: r.campus,
                    grade: r.gradeInterested,
                    actualFee: r.student?.annualFee || r.annualFee || 60000,
                    campusGrade1Fee: g1Fee,
                    admissionFeeCollected: r.admissionFeeCollected || 0,
                    donationFeeCollected: r.donationFeeCollected || 0,
                    specialBonusRate: getSpecialBonusRate(r.campus)
                }
            })

        const benefitResult = calculateTotalBenefit(formattedReferrals, context, slabs)

        // Calculate Manual Adjustments
        // IMPORTANT: Refunds (registration fee returns) are NOT earnings — tracked separately.
        const processedSettlements = settlements.filter(s => s.status === 'Processed')

        // Helper to identify registration fee refunds
        const isRefundSettlement = (s: any) => {
            const text = (s.remarks || s.bankReference || '').toLowerCase()
            return text.includes('refund') || text.includes('registration') || s.amount === 25
        }

        // Registration fee refunds — excluded from earnings
        const refundSettlements = processedSettlements.filter(isRefundSettlement)
        const refundAmount = refundSettlements.reduce((sum, s) => sum + s.amount, 0)

        // Genuine bonus/adjustment credits — included in earnings
        const bonusCredits = processedSettlements
            .filter(s => {
                if (isRefundSettlement(s)) return false
                const text = (s.remarks || s.bankReference || '').toLowerCase()
                return text.includes('bonus') || text.includes('adjustment') || text.includes('special')
            })
            .reduce((sum, s) => sum + s.amount, 0)

        const referralYield = benefitResult.totalAmount
        // totalEarned = referral yield + bonuses only (refunds are NOT income)
        const totalEarned = referralYield + bonusCredits

        const earningsSettled = processedSettlements
            .filter(s => !isRefundSettlement(s))
            .reduce((sum, s) => sum + s.amount, 0)

        const pendingSettlement = settlements
            .filter(s => s.status === 'Pending')
            .reduce((sum, s) => sum + s.amount, 0)

        // Breakdown: referral components only (no refunds)
        const finalBreakdown = [...benefitResult.breakdown]
        if (bonusCredits > 0) {
            finalBreakdown.push(`Special Credits / Bonus = ₹${bonusCredits.toLocaleString('en-IN')}`)
        }

        return {
            success: true,
            data: {
                totalEarned,
                referralYield,
                bonusCredits,
                refundAmount,         // Registration fee refund — shown separately, NOT part of earnings
                totalSettled: earningsSettled, // Now only shows earnings payouts
                pendingSettlement,
                remainingBalance: Math.max(0, totalEarned - earningsSettled),
                settlements: JSON.parse(JSON.stringify(settlements)),
                breakdown: finalBreakdown,
                referralCount: formattedReferrals.length
            }
        }

    } catch (error) {
        console.error('getMyEarningsStats error:', error)
        return { success: false, error: 'Failed to fetch earnings' }
    }
}
