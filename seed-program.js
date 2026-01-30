const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding external program...')

    const program = await prisma.externalProgram.upsert({
        where: { slug: 'test-program' },
        update: {},
        create: {
            title: 'Test External Program',
            slug: 'test-program',
            description: 'This is a test program to verify the external gateway.',
            targetUrl: 'https://google.com',
            commissionAmount: 500,
            rewardType: 'CASH',
            isActive: true,
            imageUrl: 'https://placehold.co/600x400'
        }
    })

    console.log('Program seeded:', program)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
