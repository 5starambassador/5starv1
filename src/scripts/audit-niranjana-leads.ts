import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const niranjana = await prisma.user.findFirst({
        where: { mobileNumber: '9500395309' }
    })

    if (!niranjana) {
        console.log('Niranjana not found')
        return
    }

    const leads = await prisma.referralLead.findMany({
        where: { userId: niranjana.userId }
    })

    console.log(`--- Leads for Niranjana (${niranjana.fullName}) ---`)
    leads.forEach(l => {
        console.log(`Lead Name: ${l.parentName}, Student: ${l.studentName}, Fee: ${l.annualFee}, Adm: ${l.admissionFeeCollected}, Don: ${l.donationFeeCollected}, Status: ${l.leadStatus}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
