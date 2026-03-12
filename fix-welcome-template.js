const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixWelcomeTemplate() {
    const template = await prisma.whatsAppConfig.findFirst({
        where: { templateName: 'welcome_message' }
    })
    
    if (template) {
        console.log('Current welcome_message config:', template)
        await prisma.whatsAppConfig.update({
            where: { id: template.id },
            data: {
                requiredVariablesCount: 2,
                description: 'Welcome to APP! (Requires 2 vars: 1=Referral Code, 2=Link)'
            }
        })
        console.log('welcome_message updated successfully to 2 variables.')
    } else {
        console.log('Template welcome_message not found.')
    }
    
    await prisma.$disconnect()
}

fixWelcomeTemplate()
