const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixNudgeTemplate() {
    // 1. Fix the nudge template name and variable count
    // The screenshot shows it expects 1 param.
    // Also removing the trailing dot if it exists.
    const nudge = await prisma.whatsAppConfig.findFirst({
        where: { id: 14 }
    })
    
    if (nudge) {
        console.log('Current nudge config:', nudge)
        await prisma.whatsAppConfig.update({
            where: { id: 14 },
            data: {
                templateName: 'nudge_for_active_users_with_0_referrals', // Ensure no dot
                requiredVariablesCount: 1, // As per MSG91 error
                description: 'Nudge for active users with 0 referrals (requires 1 variable)'
            }
        })
        console.log('Nudge template updated successfully.')
    }

    // 2. Audit other templates for trailing dots while we are at it
    const all = await prisma.whatsAppConfig.findMany()
    for (const config of all) {
        if (config.templateName.endsWith('.')) {
            const newName = config.templateName.slice(0, -1)
            console.log(`Fixing trailing dot for ID ${config.id}: ${config.templateName} -> ${newName}`)
            await prisma.whatsAppConfig.update({
                where: { id: config.id },
                data: { templateName: newName }
            })
        }
    }
    
    await prisma.$disconnect()
}

fixNudgeTemplate()
