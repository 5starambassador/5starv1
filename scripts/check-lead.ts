import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    try {
        const leads = await prisma.referralLead.findMany({
            where: { leadId: 1235 }
        })
        
        if (leads.length > 0) {
            console.log(`Lead ID: ${leads[0].leadId} | Status: ${leads[0].leadStatus} | Student: ${leads[0].studentName}`)
        } else {
            console.log('Lead 1235 not found in referralLead table')
            // Check student table?
        }
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
