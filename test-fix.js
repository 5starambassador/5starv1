const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        // 1. Emulate the FIXED logic (using 'Follow_up')
        const total = await prisma.referralLead.count()
        const confirmed = await prisma.referralLead.count({
            where: { leadStatus: 'Confirmed' }
        })

        // The key fix: looking for 'Follow_up' (underscore) NOT 'Follow-up' (hyphen)
        const pendingFixed = await prisma.referralLead.count({
            where: { leadStatus: { in: ['New', 'Follow_up'] } }
        })

        // 2. Emulate the BROKEN logic (what caused the bug likely)
        let pendingBroken = 'Error'
        try {
            pendingBroken = await prisma.referralLead.count({
                where: { leadStatus: { in: ['New', 'Follow-up'] } }
            })
        } catch (e) {
            pendingBroken = 'Prisma Error (Invalid Enum Value)'
        }

        console.log('--- LOGIC COMPARISON ---')
        console.log(`TOTAL: ${total}`)
        console.log(`CONFIRMED: ${confirmed}`)
        console.log(`PENDING (Fixed Logic): ${pendingFixed}  <-- This should be ~141`)
        console.log(`PENDING (Broken Logic): ${pendingBroken} <-- This should be 49 (or close to it)`)
        console.log('------------------------')

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
