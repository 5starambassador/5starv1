import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const names = ['Mathivannan M', 'Ramya', 'Niranjana', 'KB KALPANA', 'Mathina begam.S']
    const users = await prisma.user.findMany({
        where: { fullName: { in: names } },
        select: { fullName: true, role: true, childInAchariya: true }
    })

    console.log('--- Roles of displayed users ---')
    console.log(JSON.stringify(users, null, 2))

    console.log('\n--- Checking ReferralLead status distribution for "Others" ---')
    const othersLeads = await prisma.referralLead.findMany({
        where: { user: { role: 'Others' } },
        select: { leadStatus: true }
    })

    const stats: Record<string, number> = {}
    othersLeads.forEach(l => {
        stats[l.leadStatus] = (stats[l.leadStatus] || 0) + 1
    })
    console.log(JSON.stringify(stats, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
