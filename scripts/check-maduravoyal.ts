import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🕵️ Checking for potential Maduravoyal user typos...')

    const users = await prisma.user.findMany({
        where: {
            assignedCampus: {
                contains: 'MADURAVOYAL',
                mode: 'insensitive'
            }
        },
        select: { userId: true, assignedCampus: true }
    })

    if (users.length === 0) {
        console.log('✅ No users found with "MADURAVOYAL" in assignedCampus string.')
        console.log('   (This confirms the campus is genuinely empty, not a mismatch error)')
    } else {
        console.log(`⚠️ Found ${users.length} users matching "MADURAVOYAL":`)
        const counts: Record<string, number> = {}
        users.forEach(u => {
            const s = u.assignedCampus || 'null'
            counts[s] = (counts[s] || 0) + 1
        })
        console.table(counts)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
