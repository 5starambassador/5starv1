import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const mobiles = ['7708838990', '9500395309', '9176188910', '8058126862']
    const users = await prisma.user.findMany({
        where: { mobileNumber: { in: mobiles } },
        include: {
            referrals: {
                where: {
                    leadStatus: { in: ['Confirmed', 'Admitted'] },
                    admittedYear: '2026-2027'
                }
            }
        }
    })

    console.log('--- Expert Audit: Referral Fees vs Slab Rewards ---')
    for (const u of users) {
        console.log(`\nAmbassador: ${u.fullName} (${u.mobileNumber})`)
        console.log(`Role: ${u.role}, Goal: ${u.childInAchariya ? 'A (Waiver)' : 'B (Payout)'}`)

        u.referrals.forEach((r, i) => {
            console.log(`  Referral ${i + 1}: ${r.parentName}, Actual Fee in DB: ${r.annualFee}, Admitted Year: ${r.admittedYear}`)
        })
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
