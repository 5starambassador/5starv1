const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkConfig() {
    const config = await prisma.whatsAppConfig.findFirst({
        where: { templateName: 'nudge_for_active_users_with_0_referrals' }
    })
    console.log('Specific Template Config:', JSON.stringify(config, null, 2))
    
    const count = await prisma.whatsAppConfig.count()
    console.log('Total templates configured:', count)
    
    await prisma.$disconnect()
}

checkConfig()
