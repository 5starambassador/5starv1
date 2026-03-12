import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const mobile = '9865643980'
    const EXCLUDED_FROM_SLAB = ['ACET', 'AASC', 'ACCHM']

    const user = await prisma.user.findFirst({ where: { mobileNumber: { contains: mobile } } })
    if (!user) {
        console.log(`User with mobile ${mobile} not found`)
        return
    }

    const userId = user.userId
    console.log(`Found user: ${user.fullName}, ID: ${userId}`)

    const count = await prisma.referralLead.count({
        where: {
            userId: user.userId,
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            campus: { notIn: EXCLUDED_FROM_SLAB }
        }
    })

    console.log(`Query Result for userId ${userId}: ${count}`)

    const leads = await prisma.referralLead.findMany({
        where: {
            userId: user.userId,
        }
    })

    console.log('\nAll Leads for this user:')
    leads.forEach(l => {
        const isIncluded = ['Confirmed', 'Admitted'].includes(l.leadStatus) && !EXCLUDED_FROM_SLAB.includes(l.campus || '')
        console.log(`- ID: ${l.leadId}, Status: ${l.leadStatus}, Campus: ${l.campus}, Included in count?: ${isIncluded}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
