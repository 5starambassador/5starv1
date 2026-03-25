import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const activeLogs = await prisma.campaignLog.findMany({
        where: { status: 'PROCESSING' },
        include: { campaign: true }
    })

    console.log(`Found ${activeLogs.length} processing logs.`)
    for (const log of activeLogs) {
        console.log(`Campaign: ${log.campaign.name} (ID: ${log.campaignId})`)
        console.log(`Audience: ${JSON.stringify(log.campaign.targetAudience)}`)
        console.log(`RecipientCount: ${log.recipientCount}`)
        console.log(`Started: ${log.runAt}`)
        console.log('---')
    }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
