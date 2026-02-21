import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const lead = await prisma.referralLead.findFirst({
        where: {
            parentName: 'K S Heman',
            userId: 1113 // Niranjana's ID from previous audit mobile search
        }
    })

    if (lead) {
        console.log('--- Detailed Lead Data for K S Heman ---')
        console.log(`Lead ID: ${lead.leadId}`)
        console.log(`Annual Fee (CRM): ${lead.annualFee}`)
        console.log(`Admission Fee Collected: ${lead.admissionFeeCollected}`)
        console.log(`Donation Fee Collected: ${lead.donationFeeCollected}`)
        console.log(`Admitted Year: ${lead.admittedYear}`)
        console.log(`Status: ${lead.leadStatus}`)
    } else {
        // Try by mobile to be sure
        const niranjana = await prisma.user.findUnique({ where: { mobileNumber: '9500395309' } })
        if (niranjana) {
            const leadByNiranjana = await prisma.referralLead.findFirst({
                where: { userId: niranjana.userId, parentName: { contains: 'Heman' } }
            })
            console.log('Lead Debug:', JSON.stringify(leadByNiranjana, null, 2))
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
