const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function syncTemplates() {
    const missingTemplates = [
        {
            eventKey: 'ACTIVATE_ACCOUNT',
            templateName: 'activate_your_account',
            requiredVariablesCount: 1,
            description: 'Link or OTP to activate user account.',
            isEnabled: true
        },
        {
            eventKey: 'PENDING_ACCOUNT',
            templateName: 'pending_account_status',
            requiredVariablesCount: 0,
            description: 'Update on pending account status.',
            isEnabled: true
        }
    ]

    for (const t of missingTemplates) {
        const exists = await prisma.whatsAppConfig.findFirst({
            where: { templateName: t.templateName }
        })
        
        if (!exists) {
            console.log(`Adding missing template: ${t.templateName}`)
            await prisma.whatsAppConfig.create({ data: t })
        } else {
            console.log(`Template already exists: ${t.templateName}`)
        }
    }
    
    await prisma.$disconnect()
}

syncTemplates()
