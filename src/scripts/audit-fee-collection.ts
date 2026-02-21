import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const leads = await prisma.referralLead.findMany({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            admittedYear: '2026-2027'
        },
        include: {
            user: {
                select: { fullName: true }
            }
        }
    })

    console.log(`--- Audit: Fee Collection for 2026-2027 (${leads.length} Active Leads) ---`)

    const leadsWithMissingFees = leads.filter(l => !l.admissionFeeCollected && !l.donationFeeCollected)

    if (leadsWithMissingFees.length > 0) {
        console.log(`\n⚠️ Found ${leadsWithMissingFees.length} leads with ₹0 recorded fees:`)
        leadsWithMissingFees.forEach(l => {
            console.log(`- Ambassador: ${l.user.fullName}, Parent: ${l.parentName}, Status: ${l.leadStatus}, Campus: ${l.campus}`)
        })
        console.log('\nRecommendation: Admissions team should ensure "Admission Fee Collected" and "Donation Fee Collected" are entered for these leads to trigger profit sharing.')
    } else {
        console.log('\n✅ All active leads have fees recorded.')
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
