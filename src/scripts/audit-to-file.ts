import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import fs from 'fs'

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

    let output = '--- Expert Audit: Referral Fees vs Slab Rewards ---\n'
    for (const u of users) {
        output += `\nAmbassador: ${u.fullName} (${u.mobileNumber})\n`
        output += `Role: ${u.role}, Goal: ${u.childInAchariya ? 'A (Waiver)' : 'B (Payout)'}\n`

        u.referrals.forEach((r, i) => {
            output += `  Referral ${i + 1}: ${r.parentName}, Actual Fee in DB: ${r.annualFee}, Admitted Year: ${r.admittedYear}\n`
        })
    }
    fs.writeFileSync('audit_results.txt', output)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
