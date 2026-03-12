const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const mapping = [
    { event: 'WELCOME_MESSAGE', vars: 2, desc: 'Welcome (1:Code, 2:Link)' },
    { event: 'REFERRAL_OTP', vars: 1, desc: 'OTP (1:OTP)' },
    { event: 'REFERRAL_SUBMITTED_AMBASSADOR', vars: 3, desc: 'Ambassador Notif (1:Name, 2:Parent, 3:Campus)' },
    { event: 'REFERRAL_SUBMITTED_PARENT', vars: 3, desc: 'Parent Notif (1:Name, 2:Ambassador, 3:Campus)' },
    { event: 'PAYMENT_REMINDER', vars: 2, desc: 'Payment Reminder (1:Name, 2:Fee)' },
    { event: 'BANK_DETAILS_REMINDER', vars: 1, desc: 'Bank Reminder (1:Name)' },
    { event: 'REFERRAL_CONFIRMED', vars: 2, desc: 'Referral Success (1:Parent, 2:Count)' },
    { event: 'FIVE_STAR_ACHIEVEMENT', vars: 1, desc: 'Achievement (1:Name)' },
    { event: 'SETTLEMENT_PROCESSED', vars: 1, desc: 'Settlement (1:Amount)' },
    { event: 'TICKET_RESPONSE', vars: 1, desc: 'Support (1:Subject)' },
    { event: 'KYC_APPROVED', vars: 2, desc: 'KYC OK (1:Name, 2:Link)' },
    { event: 'KYC_REJECTED', vars: 2, desc: 'KYC No (1:Name, 2:Reason)' },
    { event: 'PROGRAM_LAUNCH', vars: 2, desc: 'New Program (1:Title, 2:Link)' },
    { event: 'ACTIVATE_ACCOUNT', vars: 1, desc: 'Activate (1:Name)' }
]

async function masterSync() {
    console.log('--- STARTING MASTER VARIABLE SYNC ---')
    for (const item of mapping) {
        const config = await prisma.whatsAppConfig.findFirst({
            where: { eventKey: item.event }
        })
        
        if (config) {
            console.log(`Updating [${config.templateName}] (${item.event}) -> ${item.vars} vars`)
            await prisma.whatsAppConfig.update({
                where: { id: config.id },
                data: {
                    requiredVariablesCount: item.vars,
                    description: item.desc
                }
            })
        } else {
            console.warn(`MISSING CONFIG FOR EVENT: ${item.event}`)
        }
    }
    
    // Also special handling for welcome_message name mismatch if any
    const welcomeByTitle = await prisma.whatsAppConfig.findFirst({
        where: { templateName: 'welcome_message' }
    })
    if (welcomeByTitle && welcomeByTitle.requiredVariablesCount !== 2) {
        await prisma.whatsAppConfig.update({
            where: { id: welcomeByTitle.id },
            data: { requiredVariablesCount: 2 }
        })
    }

    await prisma.$disconnect()
    console.log('--- SYNC COMPLETE ---')
}

masterSync()
