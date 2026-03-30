import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const leadCount = await prisma.referralLead.count()
    const userCount = await prisma.user.count()
    const ticketCount = await prisma.supportTicket.count()
    const studentCount = await prisma.student.count()
    
    console.log(`Current Database Counts:`)
    console.log(`Leads: ${leadCount}`)
    console.log(`Users: ${userCount}`)
    console.log(`Tickets: ${ticketCount}`)
    console.log(`Students: ${studentCount}`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
