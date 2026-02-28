
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Robust Data Correction: *2026-202* -> 2026-2027 ---')

        // 1. Fix ReferralLeads
        const leads = await prisma.referralLead.findMany({
            where: {
                admittedYear: { contains: '2026-202' }
            }
        })
        console.log(`Found ${leads.length} leads matching "2026-202".`)

        for (const lead of leads) {
            if (lead.admittedYear !== '2026-2027') {
                await prisma.referralLead.update({
                    where: { leadId: lead.leadId },
                    data: { admittedYear: '2026-2027', academicYear: '2026-2027' }
                })
                console.log(`  - Updated LeadID: ${lead.leadId} (was: "${lead.admittedYear}")`)
            }
        }

        // 2. Fix Students
        const students = await prisma.student.findMany({
            where: {
                academicYear: { contains: '2026-202' }
            }
        })
        console.log(`Found ${students.length} students matching "2026-202".`)

        for (const student of students) {
            if (student.academicYear !== '2026-2027') {
                await prisma.student.update({
                    where: { studentId: student.studentId },
                    data: { academicYear: '2026-2027' }
                })
                console.log(`  - Updated StudentID: ${student.studentId} (was: "${student.academicYear}")`)
            }
        }

        console.log('--- Correction Finished ---')

    } catch (err) {
        console.error('Correction failed:', err)
    }
}

main().finally(() => prisma.$disconnect())
