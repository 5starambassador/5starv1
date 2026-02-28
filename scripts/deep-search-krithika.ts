
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const mobile = '9003977098'
        console.log(`--- Deep Search for Mobile: ${mobile} (Krithika) ---`)

        const users = await prisma.user.findMany({
            where: { mobileNumber: mobile }
        })
        console.log(`Users found with this mobile: ${users.length}`)
        users.forEach(u => console.log(`  - UserID: ${u.userId} | Name: ${u.fullName} | Code: ${u.referralCode}`))

        const leads = await prisma.referralLead.findMany({
            where: { parentMobile: mobile }
        })
        console.log(`Leads found where this mobile is the PARENT: ${leads.length}`)
        leads.forEach(l => console.log(`  - LeadID: ${l.leadId} | Student: ${l.studentName} | Parent: ${l.parentName} | Status: ${l.leadStatus}`))

        const referrersLeads = await prisma.referralLead.findMany({
            where: { user: { mobileNumber: mobile } }
        })
        console.log(`Leads referred BY this mobile: ${referrersLeads.length}`)
        referrersLeads.forEach(l => console.log(`  - LeadID: ${l.leadId} | Student: ${l.studentName} | Status: ${l.leadStatus}`))

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
