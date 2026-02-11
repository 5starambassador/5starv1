
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- STARTING DATA AUDIT ---')

    // 1. Get all Confirmed Referral Leads
    const confirmedLeads = await prisma.referralLead.findMany({
        where: { leadStatus: 'Confirmed' },
        select: { leadId: true, studentName: true, parentMobile: true, createdAt: true }
    })

    console.log(`\nTotal Confirmed Referral Leads: ${confirmedLeads.length}`)

    // 2. Get all Students who came from referrals
    // We check if 'referralLeadId' exists on Student model. 
    // Based on previous view of student-actions.ts, it seems to be there.
    // If not, we'll try to match by mobile/name.

    let studentsFromLeads = []
    try {
        studentsFromLeads = await prisma.student.findMany({
            where: {
                referralLeadId: { not: null }
            },
            select: { studentId: true, fullName: true, referralLeadId: true }
        })
        console.log(`Total Students with linked Referral Lead ID: ${studentsFromLeads.length}`)
    } catch (e) {
        console.log('Note: `referralLeadId` column might not exist on Student table yet. Falling back to manual check.')
    }

    // 3. Find missing links
    const linkedLeadIds = new Set(studentsFromLeads.map(s => s.referralLeadId))
    const missingLeads = confirmedLeads.filter(l => !linkedLeadIds.has(l.leadId))

    if (missingLeads.length === 0) {
        console.log('\n✅ SUCCESS: All confirmed leads are successfully linked to Student records.')
    } else {
        console.log(`\n⚠️ DISCREPANCY: Found ${missingLeads.length} Confirmed Leads NOT linked to a Student record via ID.`)

        // Try soft matching for these missing ones
        console.log('\nAttempting soft match by Parent Mobile for missing leads...')

        for (const lead of missingLeads) {
            const match = await prisma.student.findFirst({
                where: {
                    parent: { mobileNumber: lead.parentMobile }
                },
                include: { parent: true }
            })

            if (match) {
                console.log(`- Lead #${lead.leadId} (${lead.studentName}) matches Student #${match.studentId} (${match.fullName}) via Parent Mobile ${lead.parentMobile}`)
            } else {
                console.log(`- ❌ Lead #${lead.leadId} (${lead.studentName}, Parent: ${lead.parentMobile}) has NO corresponding Student record found.`)
            }
        }
    }

    console.log('\n--- AUDIT COMPLETE ---')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
