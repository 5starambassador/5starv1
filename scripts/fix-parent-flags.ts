
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function updateParentFlags() {
    console.log('--- Updating Parent Flags ---')
    
    // We use the exact enum value 'Parent' from schema.prisma
    const updateResult = await prisma.user.updateMany({
        where: {
            role: 'Parent',
            OR: [
                { childInAchariya: false },
                { childInAchariya: null } as any
            ]
        },
        data: {
            childInAchariya: true
        }
    })

    console.log(`Successfully updated ${updateResult.count} Parent users to childInAchariya = true.`)
    
    // Verification count
    const remaining = await prisma.user.count({
        where: {
            role: 'Parent',
            childInAchariya: false
        }
    })
    console.log(`Parents still with childInAchariya = false: ${remaining}`)
}

updateParentFlags().catch(console.error).finally(() => prisma.$disconnect())
