import prisma from '../src/lib/prisma'

async function main() {
    const campaigns = await prisma.campaign.findMany({
        select: { id: true, name: true, status: true, targetAudience: true, channels: true }
    })
    console.log(JSON.stringify(campaigns, null, 2))
    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
