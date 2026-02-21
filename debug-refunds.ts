
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugRefunds() {
    console.log('Checking for recent duplicate mobile numbers...')
    const users = await prisma.user.groupBy({
        by: ['mobileNumber'],
        _count: {
            userId: true
        },
        having: {
            userId: {
                _count: {
                    gt: 1
                }
            }
        }
    })
    console.log(`Found ${users.length} mobile numbers with multiple users.`)

    console.log('\nChecking recent processed refund settlements (Amount 25)...')
    const settlements = await prisma.settlement.findMany({
        where: {
            amount: 25,
            status: 'Processed'
        },
        orderBy: {
            updatedAt: 'desc'
        },
        take: 5,
        include: {
            user: {
                select: {
                    fullName: true,
                    mobileNumber: true
                }
            }
        }
    })

    console.log(`Found ${settlements.length} recent settlements:`)
    settlements.forEach(s => {
        console.log(`- ${s.user.fullName} (${s.user.mobileNumber}): ID=${s.id} Status=${s.status} Date=${s.payoutDate}`)
    })
}

debugRefunds()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
