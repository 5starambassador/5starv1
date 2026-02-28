
import { PrismaClient } from '@prisma/client'
// Mocking necessary imports and constants
const REWARD_RATES = {
    ADMISSION_PROFIT_SHARE: 0.8,
    DONATION_PROFIT_SHARE: 0.5,
    HISTORIC_BASE_YIELD: 0.03,
    APP_BONUS_DEFAULT: 0.05
};

const prisma = new PrismaClient()

async function main() {
    try {
        const yearFilter = "2026-2027"
        const mobiles = ["7598326022", "7708838990", "8248764961", "9003977098", "9047585092", "9597150068"]

        console.log(`--- Simulating getAccruedPayoutLiabilities for Year: ${yearFilter} ---`)

        const users = await prisma.user.findMany({
            where: {
                mobileNumber: { contains: mobiles[0].slice(-5) } // Just a sample or search by OR
            },
            include: {
                settlements: true,
                students: { where: { status: 'Active' } },
                referredStudents: { where: { status: 'Active' } },
                referrals: {
                    where: {
                        leadStatus: { in: ['Confirmed', 'Admitted'] },
                        admittedYear: yearFilter
                    }
                }
            }
        })

        // Actually let's just use the OR for all mobiles
        const allUsers = await prisma.user.findMany({
            where: {
                OR: mobiles.map(m => ({ mobileNumber: { contains: m.slice(-10) } }))
            },
            include: {
                settlements: true,
                students: { where: { status: 'Active' } },
                referredStudents: { where: { status: 'Active' } },
                referrals: {
                    where: {
                        leadStatus: { in: ['Confirmed', 'Admitted'] },
                        admittedYear: yearFilter
                    }
                }
            }
        })

        console.log(`Found ${allUsers.length} users to analyze.`)

        for (const u of allUsers) {
            console.log(`\nUser: ${u.fullName} (${u.role})`)
            console.log(`- Confirmed Referrals (2026-27): ${u.referrals.length}`)
            u.referrals.forEach(r => console.log(`  * Lead ${r.leadId}: Status=${r.leadStatus}, Fee=${r.annualFee}, CampusId=${r.campusId}`))

            // Check Grade - 1 Fee
            const g1Fees = await prisma.gradeFee.findMany({
                where: {
                    campusId: { in: u.referrals.map(r => r.campusId).filter(Boolean) as number[] },
                    grade: { in: ['Grade - 1', 'Grade-1', 'Grade 1'] },
                    academicYear: yearFilter
                }
            })
            console.log(`- Grade 1 Fees Found: ${g1Fees.length}`)
            g1Fees.forEach(f => console.log(`  * Campus ${f.campusId}: ${f.annualFee_wotp}`))

            // Check Slab
            const slab = await prisma.benefitSlab.findFirst({
                where: { referralCount: Math.min(u.referrals.length, 5) },
                orderBy: { referralCount: 'desc' }
            })
            console.log(`- Applicable Slab: ${slab?.yearFeeBenefitPercent}%`)

            // Calculate roughly
            let estimatedBenefit = 0
            if (u.role === 'Parent' || (u.role === 'Staff' && u.students.length > 0)) {
                // Waiver
                const studentFee = u.students[0]?.annualFee || 60000
                estimatedBenefit = (studentFee * (slab?.yearFeeBenefitPercent || 0)) / 100
                console.log(`- Estimated Waiver (Group A): ₹${estimatedBenefit} (based on child fee ₹${studentFee})`)
            } else {
                // Payout
                for (const r of u.referrals) {
                    const campusG1 = g1Fees.find(f => f.campusId === r.campusId)?.annualFee_wotp || 0
                    estimatedBenefit += (campusG1 * (slab?.yearFeeBenefitPercent || 0)) / 100
                    console.log(`  * Referral ${r.leadId} benefit: ₹${(campusG1 * (slab?.yearFeeBenefitPercent || 0)) / 100} (G1 Fee: ${campusG1})`)
                }
                console.log(`- Estimated Payout (Group B): ₹${estimatedBenefit}`)
            }
        }

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
