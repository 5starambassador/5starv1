const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Checking Payment Data...')

    const where = {
        OR: [
            { orderStatus: 'PENDING_APPROVAL' },
            { paymentStatus: 'Pending Approval' },
            { orderStatus: 'FAILED' },
            { paymentStatus: 'Rejected by Admin' }
        ],
        paymentMethod: 'MANUAL_QR'
    }

    const count = await prisma.payment.count({ where })
    console.log(`Total Matches for 'MANUAL_QR' + Pending/Failed: ${count}`)

    const sample = await prisma.payment.findFirst({ where })
    console.log('Sample Record:', sample)

    // Check total payments regardless of filter
    const total = await prisma.payment.count()
    console.log(`Total Payments in Table: ${total}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
