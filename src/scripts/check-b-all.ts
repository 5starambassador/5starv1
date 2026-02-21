import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Group B (ChildInAchariya=false) Status Distribution ---')

    const bUsers = await prisma.user.findMany({
        where: { childInAchariya: false },
        select: {
            role: true,
            referrals: {
                select: { leadStatus: true, admittedYear: true }
            }
        }
    })

    const stats: Record<string, Record<string, number>> = {
        'Alumni': {},
        'Staff': {},
        'Others': {}
    }

    bUsers.forEach(u => {
        const role = u.role as string
        if (!stats[role]) stats[role] = {}

        u.referrals.forEach(r => {
            const status = r.leadStatus
            stats[role][status] = (stats[role][status] || 0) + 1
        })
    })

    console.log(JSON.stringify(stats, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
