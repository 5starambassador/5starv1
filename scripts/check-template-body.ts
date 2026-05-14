import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
    const waConf = await p.whatsAppConfig.findFirst({ where: { templateName: 'summer_camp_followup_01' } }) as any
    if (!waConf) {
        console.error('Template not found')
        return
    }
    console.log('TEMPLATE BODY:')
    console.log(JSON.stringify(waConf.templateBody))
    console.log('\nFULL OBJECT:')
    console.log(JSON.stringify({ templateBody: waConf.templateBody, requiredVariablesCount: waConf.requiredVariablesCount }))
}

main().catch(console.error).finally(() => p.$disconnect())
