import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const usersWithReferrals = await prisma.user.findMany({
        where: {
            role: { in: ['Others', 'Alumni'] },
            referrals: { some: {} }
        },
        include: {
            referrals: true
        }
    })

    console.log('--- Final Audit: Detailed Lead Status for others/Alumni ---')
    usersWithReferrals.forEach(u => {
        console.log(`User: ${u.fullName} (Role: ${u.role}, Goal: Group ${u.childInAchariya ? 'A' : 'B'})`)
        u.referrals.forEach(r => {
            console.log(`  - Parent: ${r.parentName}, Status: ${r.leadStatus}, Code: ${r.admissionNumber || 'N/A'}`)
        })
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
