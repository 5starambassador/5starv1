'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { calculateTotalBenefit } from '@/lib/benefit-calculator'
import { getSpecialBonusRate } from '@/lib/reward-constants'

/**
 * Generates a complete financial ledger for a specific ambassador.
 * Returns a chronological list of earnings (referrals) and settlements (payouts/waivers).
 */
export async function getAmbassadorLedger(userId: number, academicYear: string = '2026-2027') {
    const admin = await getCurrentUser()
    // Admin or self can view
    if (!admin || (Number(admin.userId) !== userId && admin.role !== 'Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // 1. Fetch Academic Year dates for boundary filtering
        const yearRecord = await prisma.academicYear.findUnique({
            where: { year: academicYear }
        })

        const dateFilter = yearRecord ? {
            createdAt: {
                gte: yearRecord.startDate,
                lte: yearRecord.endDate
            }
        } : {}

        // 2. Fetch User data with all components
        const u = await prisma.user.findUnique({
            where: { userId },
            include: {
                settlements: {
                    orderBy: { createdAt: 'desc' }
                },
                referrals: {
                    where: {
                        leadStatus: { in: ['Confirmed', 'Admitted'] },
                        OR: [
                            { admittedYear: academicYear },
                            dateFilter
                        ]
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!u) return { success: false, error: 'User not found' }

        // 3. Fetch Slabs and Fees for calculation
        const [slabs, gradeFees] = await Promise.all([
            prisma.benefitSlab.findMany({ orderBy: { referralCount: 'asc' } }),
            prisma.gradeFee.findMany({
                where: {
                    grade: { in: ['Grade - 1', 'Grade-1', 'Grade 1'] },
                    academicYear
                }
            })
        ])

        const grade1FeeMap = new Map()
        gradeFees.forEach(gf => {
            grade1FeeMap.set(gf.campusId, gf.annualFee_wotp || gf.annualFee_otp || 0)
        })

        // 4. Calculate accurate earnings using the official calculator
        const calculatorReferrals = u.referrals.map((r: any) => ({
            id: r.leadId,
            campusId: r.campusId || 0,
            campusName: r.campus || undefined,
            grade: r.gradeInterested || 'Grade-1',
            actualFee: r.annualFee || 0,
            campusGrade1Fee: grade1FeeMap.get(r.campusId),
            admissionFeeCollected: r.admissionFeeCollected || 0,
            donationFeeCollected: r.donationFeeCollected || 0,
            specialBonusRate: getSpecialBonusRate(r.campus)
        }))

        const calc = calculateTotalBenefit(calculatorReferrals, {
            role: u.role as any,
            childInAchariya: u.childInAchariya,
            studentFee: u.studentFee || 60000,
            isFiveStarLastYear: u.isFiveStarMember
        }, slabs as any)

        // 5. Construct chronological ledger entries
        const ledgerEntries: any[] = []

        // A. Add Settlements (Payouts/Waivers) as DEBITS (reduces remaining amount)
        u.settlements.forEach((s: any) => {
            const isWaiver = (s.remarks || '').toLowerCase().includes('waiver')
            const isRefund = (s.remarks || '').toLowerCase().includes('registration') || s.amount === 25

            ledgerEntries.push({
                id: `S-${s.id}`,
                type: isRefund ? 'REFUND' : (isWaiver ? 'WAIVER' : 'PAYOUT'),
                txId: s.bankReference || `ID: ${s.id}`,
                amount: s.amount,
                date: s.createdAt,
                status: s.status,
                remarks: s.remarks,
                direction: 'OUT'
            })
        })

        // B. Add Earnings (Confirmed Referrals) as CREDITS (increases total amount)
        u.referrals.forEach((r: any) => {
            // Recalculate individual share for this specific referral
            const specialBonus = getSpecialBonusRate(r.campus) || 0
            const admBonus = (r.admissionFeeCollected || 0) * 0.8
            const donBonus = (r.donationFeeCollected || 0) * 0.5

            // Slab share calculation (this is virtual based on the final slab)
            const g1Fee = grade1FeeMap.get(r.campusId) || 0
            const slabIndividualShare = (g1Fee * calc.tierPercent) / 100

            const totalRefYield = specialBonus + admBonus + donBonus + slabIndividualShare

            ledgerEntries.push({
                id: `R-${r.leadId}`,
                type: 'EARNING',
                txId: r.admissionNumber ? `EPR: ${r.admissionNumber}` : `Lead: ${r.leadId}`,
                amount: totalRefYield,
                date: r.confirmedDate || r.createdAt,
                status: 'Confirmed',
                remarks: `Referral: ${r.studentName} (${r.campus})`,
                direction: 'IN',
                breakdown: {
                    specialBonus,
                    admBonus,
                    donBonus,
                    slabShare: slabIndividualShare,
                    tierPercent: calc.tierPercent
                }
            })
        })

        // Sort by date DESC
        ledgerEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        const totalSettledCounted = u.settlements
            .filter((s: any) => s.status === 'Processed')
            .reduce((acc: number, s: any) => acc + s.amount, 0)

        return {
            success: true,
            data: {
                ledger: ledgerEntries,
                summary: {
                    totalEarned: calc.totalAmount,
                    totalSettled: totalSettledCounted,
                    outstanding: calc.totalAmount - totalSettledCounted,
                    referralCount: u.referrals.length,
                    tierPercent: calc.tierPercent
                }
            }
        }
    } catch (error) {
        console.error('Error in getAmbassadorLedger:', error)
        return { success: false, error: 'Failed to generate ledger' }
    }
}
