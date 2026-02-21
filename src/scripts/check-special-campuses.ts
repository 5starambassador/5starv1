import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Checking for Special Campus (AASC, ACET, ACCHM) Referrals for 2026-2027 ---')
    const leads = await prisma.referralLead.findMany({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            admittedYear: '2026-2027',
            campus: { in: ['AASC', 'ACET', 'ACCHM'] }
        },
        include: {
            user: {
                select: {
                    fullName: true,
                    role: true
                }
            }
        }
    })

    console.log(`Found ${leads.length} special campus referrals.`)
    leads.forEach(l => {
        console.log(`- Ambassador: ${l.user.fullName}, Campus: ${l.campus}, Lead: ${l.parentName}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
