import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
    const c = await p.campaign.findUnique({ where: { id: 36 } }) as any
    console.log('campaign.templateBody:', JSON.stringify(c.templateBody))
    console.log('campaign.waTemplateName:', c.waTemplateName)
    console.log('campaign.waVariableMapping:', JSON.stringify(c.waVariableMapping))
}

main().catch(console.error).finally(() => p.$disconnect())
