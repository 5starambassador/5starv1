
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // IDs from previous audit
    const targetLeadIds = [
        627, // Lakshmi
        744, // Dilakshi.G
        745, // Test
        755, // Aric Jeffrin Paul
        754, // Faaz
        743, // Harshita Jain
        742, // Ridhi Jain
        676  // K S Heman
    ]

    const leads = await prisma.referralLead.findMany({
        where: { leadId: { in: targetLeadIds } },
        include: { user: true } // Include ambassador info
    })

    console.log('--- DETAILED INSPECTION ---')
    for (const lead of leads) {
        console.log(`\nLead #${lead.leadId}: ${lead.studentName}`)
        console.log(`- Parent: ${lead.parentName} (${lead.parentMobile})`)
        console.log(`- Campus: ${lead.campus} (ID: ${lead.campusId})`)
        console.log(`- Grade: ${lead.gradeInterested}`)
        console.log(`- Ambassador: ${lead.user?.fullName} (ID: ${lead.userId})`)

        // Check if Campus Name resolves to an ID if ID is missing
        if (!lead.campusId && lead.campus) {
            const c = await prisma.campus.findUnique({ where: { campusName: lead.campus } })
            console.log(`  -> Resolve Campus '${lead.campus}': ${c ? 'Found ID ' + c.id : 'NOT FOUND'}`)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
