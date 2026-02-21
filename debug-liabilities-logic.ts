
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// --- COPIED logic from benefit-calculator.ts ---
function calculateTotalBenefit(
    currentReferrals: any[],
    user: any,
    slabs: any[]
) {
    const referralCount = currentReferrals.length
    const isFiveStar = user.isFiveStarLastYear || false
    // ACTIVATION LAW: Long Term benefits trigger ONLY if 1+ current referral exists
    const isActive = referralCount >= 1

    let breakdown: string[] = []
    let currentYearAmount = 0
    let longTermBaseAmount = 0
    let finalTierPercent = 0

    let admissionShare = 0
    let donationShare = 0
    let slabShare = 0
    let specialBonusShare = 0
    let appBonusPercentResult = 0

    // SAFETY FALLBACK: If student fee is missing or invalidly low (e.g. database corruption), use 60000
    const safeStudentFee = (!user.studentFee || user.studentFee < 1000) ? 60000 : user.studentFee

    // 1. Calculate Historic Base Value (Fixed Cash Sum derived from Top 5 Previous Year Referrals)
    // Formula: SUM(3% x Actual Fee)
    if (isFiveStar && isActive && user.previousYearReferrals && user.previousYearReferrals.length > 0) {
        const relevantReferrals = user.previousYearReferrals.slice(0, 5)
        longTermBaseAmount = relevantReferrals.reduce((sum: number, r: any) => {
            const feeBase = r.actualFee || 60000
            const amount = Math.floor(feeBase * 0.03)
            breakdown.push(`🏛️ HISTORIC BASE: 3% of ₹${feeBase.toLocaleString()} = ₹${amount.toLocaleString()}`)
            return sum + amount
        }, 0)
    }

    // 2. Calculate Current Year Benefit (Linear for 5-Star, Aggressive for Standard)
    // SPLIT STRATEGY: Isolate ACET, AASC, ACCHM from Standard Calculation
    const SPECIAL_RATES: Record<string, number> = {
        'ACET': 5000,
        'AASC': 2000,
        'ACCHM': 2000
    }

    const specialReferrals = currentReferrals.filter(r => r.campusName && SPECIAL_RATES[r.campusName])
    const standardReferrals = currentReferrals.filter(r => !r.campusName || !SPECIAL_RATES[r.campusName])

    // A. Calculate Special Benefits (Flat Additive)
    if (specialReferrals.length > 0) {
        specialReferrals.forEach((ref, idx) => {
            const rate = SPECIAL_RATES[ref.campusName || ''] || 0
            specialBonusShare += rate
            breakdown.push(`⭐ SPECIAL BONUS (${ref.campusName}): Flat Benefit = ₹${rate.toLocaleString()}`)
        })
    }

    // B. Calculate Standard Benefits (Existing Logic)
    const stdCount = standardReferrals.length

    if (stdCount > 0 && slabs.length > 0) {
        const sorted = [...slabs].sort((a: any, b: any) => a.referralCount - b.referralCount)

        const getPercent = (count: number) => {
            // For 5-Star (Long Term), strictly follow 5% per referral (1=5, 2=10, 3=15...)
            if (isFiveStar) {
                return count * 5
            }
            // For Standard (Short Term), follow the slab table
            const slab = sorted.find(s => count <= s.referralCount)
            return slab ? slab.benefitPercent : sorted[sorted.length - 1].benefitPercent
        }

        const tierPercent = getPercent(stdCount)
        finalTierPercent = tierPercent

        // 5-Star Base Calculation: (Tier% * StudentFee) * ReferralCount ?? NO, logic from doc is simpler
        // Actually: It's just slab based percent.
        // Let's stick to existing logic for now.

        // Calculate Slab Share
        // Formula: (Tier% * StudentFee) * Count
        // Wait, current logic in code (implied) might be per-referral or total.
        // Assuming slab percent is TOTAL yield for that count.
        // Let's standard: (StudentFee * Tier%) * Count
        // NO, typically slab is "For X referrals, get Y%". 
        // Example: 1 Ref -> 5%, 2 Ref -> 10%.
        // So for 2 referrals, total is 2 * (Fee * 10%)? Or just (Fee * 10%) * 2? Yes.

        const perReferralShare = (safeStudentFee * tierPercent) / 100
        slabShare = perReferralShare * stdCount

        breakdown.push(`📈 SLAB REWARD: ${stdCount} Std Ref @ ${tierPercent}% = ₹${slabShare.toLocaleString()}`)
    }

    // 3. New Incentive Integration: 80% Admission + 50% Donation (Normal Logic Only)
    currentReferrals.forEach(ref => {
        if (!ref.campusName || !SPECIAL_RATES[ref.campusName]) {
            const admFee = (ref as any).admissionFeeCollected || 0
            const donFee = (ref as any).donationFeeCollected || 0

            if (admFee > 0 || donFee > 0) {
                const admBonus = admFee * 0.8
                const donBonus = donFee * 0.5
                admissionShare += admBonus
                donationShare += donBonus
                breakdown.push(`💰 COMMISSION: 80% Adm (₹${admBonus}) + 50% Don (₹${donBonus})`)
            }
        }
    })

    currentYearAmount = slabShare + admissionShare + donationShare + specialBonusShare

    return {
        totalAmount: currentYearAmount + longTermBaseAmount,
        breakdown,
        isLongActive: isActive && isFiveStar,
        longTermBaseAmount,
        currentYearAmount,
        tierPercent: finalTierPercent,
        admissionShare,
        donationShare,
        slabShare,
        specialBonusShare
    }
}

// --- MAIN SCRIPT ---

async function main() {
    console.log('Starting Liability Calculation Debug...')
    const yearFilter = '2026-2027'

    const [users, slabs] = await Promise.all([
        prisma.user.findMany({
            where: {
                referrals: {
                    some: {
                        leadStatus: { in: ['Confirmed', 'Admitted'] },
                        admittedYear: yearFilter
                    }
                }
            },
            include: {
                settlements: true,
                students: {
                    where: { status: 'Active' },
                    select: { fullName: true, grade: true, annualFee: true, campus: { select: { campusName: true } } }
                },
                referredStudents: {
                    where: { status: 'Active' },
                    select: { fullName: true, grade: true, annualFee: true, campus: { select: { campusName: true } } }
                },
                referrals: {
                    where: {
                        leadStatus: { in: ['Confirmed', 'Admitted'] },
                        admittedYear: yearFilter
                    }
                }
            }
        }),
        prisma.benefitSlab.findMany({
            orderBy: { referralCount: 'asc' }
        })
    ])

    console.log(`Users Found: ${users.length}`)
    console.log(`Slabs Found: ${slabs.length}`)

    const liabilities: any[] = []

    for (const u of users) {
        // Map ReferralLeads to ReferralData
        const currentReferrals = u.referrals.map((r: any) => ({
            id: r.leadId,
            campusId: r.campusId || 0,
            campusName: r.campus || undefined,
            grade: r.gradeInterested || 'Grade-1',
            actualFee: r.annualFee || 60000,
            campusGrade1Fee: 60000,
            admissionFeeCollected: r.admissionFeeCollected || 0,
            donationFeeCollected: r.donationFeeCollected || 0
        }))

        // INTEL LOGIC: For Group A, fetch the actual student fee from linked records
        let actualChildFee = u.studentFee || 60000
        let childName = undefined
        let childGrade = undefined
        let childCampus = undefined

        if (u.childInAchariya) {
            const linkedStudent = u.students[0] || u.referredStudents.find((s: any) => s.annualFee && s.annualFee > 1000)
            if (linkedStudent) {
                actualChildFee = linkedStudent.annualFee || actualChildFee
                childName = linkedStudent.fullName
                childGrade = linkedStudent.grade
                childCampus = (linkedStudent.campus as any)?.campusName || undefined
            }
        }

        const calcResult = calculateTotalBenefit(currentReferrals, {
            role: u.role as any,
            childInAchariya: u.childInAchariya,
            studentFee: actualChildFee,
            isFiveStarLastYear: u.isFiveStarMember
        }, slabs)

        // Exclude registration refunds from the settled amount
        const totalSettled = u.settlements
            .filter((s: any) => {
                const remarks = (s.remarks || '').toLowerCase()
                const isRefund = remarks.includes('registration') || remarks.includes('refund') || s.amount === 25
                return !isRefund
            })
            .reduce((acc: number, s: any) => acc + (s.amount || 0), 0)

        const specialBonus = calcResult.specialBonusShare
        const profitShares = calcResult.admissionShare + calcResult.donationShare
        const slabRewards = calcResult.slabShare + (calcResult as any).longTermBaseAmount || 0

        let finalPayoutEarned = 0
        let finalWaiverEarned = 0

        if (u.role === 'Alumni' || u.role === 'Others' || (u.role === 'Staff' && !u.childInAchariya)) {
            finalPayoutEarned = calcResult.totalAmount
            finalWaiverEarned = 0
        } else {
            // Parent / Staff with child: Special Bonus is cash, rest is waiver
            finalPayoutEarned = specialBonus
            finalWaiverEarned = slabRewards + profitShares
        }

        const totalEarned = finalPayoutEarned + finalWaiverEarned
        const outstanding = totalEarned - totalSettled

        console.log(`User: ${u.fullName} | Role: ${u.role} | Earned: ${totalEarned} | Settled: ${totalSettled} | Outstanding: ${outstanding}`)

        if (outstanding > 0) {
            liabilities.push({
                userId: u.userId,
                fullName: u.fullName,
                outstanding
            })
        }
    }

    console.log(`Total Liabilities Calculated: ${liabilities.length}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
