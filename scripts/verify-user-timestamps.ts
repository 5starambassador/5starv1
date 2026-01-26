import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const CAMPUS = 'ASM HSC - VILLIANUR'
    console.log(`Checking Timestamps for ${CAMPUS}...`)

    const users = await prisma.user.findMany({
        where: { assignedCampus: CAMPUS },
        select: { role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100 // Look at top 100
    })

    console.log(`Fetched ${users.length} users.`)
    console.log('Top 10 Newest Users:')
    users.slice(0, 10).forEach(u => console.log(`- ${u.role} (${u.createdAt.toISOString()})`))

    const staff = users.filter(u => u.role === 'Staff')
    const parents = users.filter(u => u.role === 'Parent')

    console.log(`\nStats in Top ${users.length}:`)
    console.log(`Staff: ${staff.length}`)
    console.log(`Parents: ${parents.length}`)

    if (staff.length === 0) {
        console.log('\n⚠️ No Staff in top results. Checking when Staff were created...')
        const allStaff = await prisma.user.findMany({
            where: { assignedCampus: CAMPUS, role: 'Staff' },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1
        })
        if (allStaff.length > 0) {
            console.log(`Newest Staff created at: ${allStaff[0].createdAt.toISOString()}`)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
