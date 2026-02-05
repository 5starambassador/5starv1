const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
    const leadId = 33
    const lead = await prisma.programLead.findUnique({
        where: { id: leadId },
        include: { program: true }
    })

    if (lead) {
        console.log(`Lead ID: ${lead.id}`)
        console.log(`Program ID: ${lead.programId} ("${lead.program.title}")`)
        console.log(`visitorMobile: "${lead.visitorMobile}"`)
        console.log(`Status: ${lead.status}`)
    } else {
        console.log('Lead not found')
    }

    await prisma.$disconnect()
}

debug()
