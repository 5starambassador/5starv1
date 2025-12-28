
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting data wipe...')

    // Dependencies first
    console.log('Deleting Settlements...')
    try { await prisma.settlement.deleteMany({}) } catch (e) { console.log('Skipped Settlement') }

    console.log('Deleting Support Tickets...')
    try { await prisma.supportTicket.deleteMany({}) } catch (e) { console.log('Skipped SupportTicket') }

    console.log('Deleting Referral Leads...')
    await prisma.referralLead.deleteMany({})

    // Core Data
    console.log('Deleting Students...')
    await prisma.student.deleteMany({})

    console.log('Deleting Users...')
    await prisma.user.deleteMany({})

    console.log('Deleting Admins...')
    await prisma.admin.deleteMany({}) // Clean admins too to avoid conflict or confusion

    console.log('Data wipe complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
