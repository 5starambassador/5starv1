import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const DRY_RUN = process.env.DRY_RUN !== 'false'

    console.log(`--- Academic Year Data Correction ---`)
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (No changes will be applied)' : 'LIVE UPDATE'}`)

    // Target date range: January 2026
    const startDate = new Date('2026-01-01T00:00:00Z')
    const endDate = new Date('2026-02-01T23:59:59Z')

    console.log(`Searching for leads created between ${startDate.toISOString()} and ${endDate.toISOString()}...`)

    const affectedLeads = await prisma.referralLead.findMany({
        where: {
            createdAt: {
                gte: startDate,
                lte: endDate
            },
            OR: [
                { academicYear: { not: '2026-2027' } },
                { admittedYear: { not: '2026-2027' } },
                { academicYear: '' },
                { admittedYear: '' }
            ]
        },
        select: {
            leadId: true,
            studentName: true,
            parentName: true,
            academicYear: true,
            admittedYear: true,
            createdAt: true
        }
    })

    console.log(`Found ${affectedLeads.length} leads matching criteria.`)

    if (affectedLeads.length === 0) {
        console.log('No records found that require correction.')
        return
    }

    if (!DRY_RUN) {
        console.log('Applying updates...')
        const result = await prisma.referralLead.updateMany({
            where: {
                leadId: { in: affectedLeads.map(l => l.leadId) }
            },
            data: {
                academicYear: '2026-2027',
                admittedYear: '2026-2027'
            }
        })
        console.log(`Successfully updated ${result.count} leads.`)
    } else {
        console.log('\nPreview of changes (first 10 records):')
        console.table(affectedLeads.slice(0, 10).map(l => ({
            ID: l.leadId,
            Student: l.studentName,
            Created: l.createdAt.toISOString().split('T')[0],
            'Old AY': l.academicYear,
            'New AY': '2026-2027'
        })))
        console.log('\nTo apply these changes, run with DRY_RUN=false')
    }
}

main()
    .catch(e => {
        console.error('Error running correction script:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
