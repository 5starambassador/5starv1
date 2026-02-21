
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function repair() {
    console.log('--- FINAL REFERRAL DATA REPAIR ---')

    const leadsToRepair = await prisma.referralLead.updateMany({
        where: {
            leadStatus: 'Confirmed',
            OR: [
                { annualFee: null },
                { admissionFeeCollected: null },
                { donationFeeCollected: null }
            ]
        },
        data: {
            annualFee: 0,
            admissionFeeCollected: 0,
            donationFeeCollected: 0
        }
    })
    console.log(`- Repaired ${leadsToRepair.count} Confirmed Leads with NULL fields.`)
    console.log('--- REPAIR COMPLETE ---')
}

repair().catch(console.error).finally(() => prisma.$disconnect())
