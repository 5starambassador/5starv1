
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function updateParentFlags() {
    console.log('--- Updating ALL Parent Flags ---')
    
    // We update ALL users with role 'Parent' to have childInAchariya = true
    const updateResult = await prisma.user.updateMany({
        where: {
            role: 'Parent' as any
        },
        data: {
            childInAchariya: true
        }
    })

    console.log(`Successfully updated ${updateResult.count} Parent users.`)
}

updateParentFlags().catch(console.error).finally(() => prisma.$disconnect())
