
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Benefit Slabs ---')
        const slabs = await prisma.benefitSlab.findMany({
            orderBy: { referralCount: 'asc' }
        })
        console.log(JSON.stringify(slabs, null, 2))

        // Check a few users from the screenshot to see their role and details
        const userNames = ["S. Ramya", "Ramya", "S.Ramya", "Ramya S"]
        const users = await prisma.user.findMany({
            where: {
                OR: userNames.map(name => ({ fullName: { contains: name, mode: 'insensitive' } }))
            }
        })
        console.log('\n--- Potential Ambassador Users ---')
        users.forEach(u => {
            console.log(`User ID: ${u.userId} | Name: ${u.fullName} | Role: ${u.role} | 5-Star: ${u.isFiveStarMember} | Count: ${u.confirmedReferralCount}`)
        })

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
