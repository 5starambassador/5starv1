const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugLead() {
    try {
        const mobile = '9345608106'
        console.log('Searching for lead with parentMobile:', mobile)

        // Find the lead by parent's mobile (ReferralLead field is parentMobile)
        // Also searching parentPhone just in case I misread schema, but schema says parentMobile
        const leads = await prisma.referralLead.findMany({
            where: {
                parentMobile: { contains: mobile }
            },
            include: { user: true }
        })

        if (leads.length === 0) {
            console.log('No leads found with that mobile. Listing 10 most recent leads:')
            const recent = await prisma.referralLead.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' }
            })
            recent.forEach(l => {
                console.log(`[${l.leadId}] ${l.parentName} (${l.parentMobile}) - Campus: ${l.campus} (ID: ${l.campusId})`)
            })
            return
        }

        console.log(`Found ${leads.length} matching leads.`)
        for (const lead of leads) {
            console.log('--- LEAD DETAILS ---')
            console.log('Lead ID:', lead.leadId)
            console.log('Status:', lead.leadStatus)
            console.log('Parent Name:', lead.parentName)
            console.log('Campus Value (String):', lead.campus)
            console.log('Campus ID (Relation):', lead.campusId)
            console.log('Grade Interested:', lead.gradeInterested)
            console.log('Referrer:', lead.user?.fullName)

            // Check if AASC exists in Campus table
            if (lead.campus) {
                const campusDb = await prisma.campus.findFirst({
                    where: {
                        OR: [
                            { name: lead.campus },
                            { shortCode: lead.campus }
                        ]
                    }
                })
                console.log('--- CAMPUS DB CHECK ---')
                if (campusDb) {
                    console.log('Found Campus in DB:', campusDb)
                } else {
                    console.log(`Campus "${lead.campus}" NOT found in Campus table.`)
                }
            }
        }

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

debugLead()
