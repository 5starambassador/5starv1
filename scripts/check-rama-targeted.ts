
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkRama() {
    console.log('--- TARGETED RAMA DIAGNOSIS ---')

    // Search based on details in screenshot
    const mobile = '9790900990'
    const admNumber = 'ACH26-S80199'

    console.log(`Searching for Mobile: ${mobile} or Admission Number: ${admNumber}`)

    const leads = await prisma.referralLead.findMany({
        where: {
            OR: [
                { parentMobile: mobile },
                { admissionNumber: admNumber },
                { studentName: { contains: 'RAMA', mode: 'insensitive' } }
            ]
        },
        include: {
            user: true
        }
    })

    console.log('Leads Found:', leads.length)

    for (const lead of leads) {
        console.log(`Lead ID: ${lead.leadId}`)
        console.log(`- Student: ${lead.studentName}`)
        console.log(`- Mobile: ${lead.parentMobile}`)
        console.log(`- Adm No: ${lead.admissionNumber}`)
        console.log(`- Admitted Year: ${lead.admittedYear}`)
        console.log(`- Status: ${lead.leadStatus}`)

        const student = await prisma.student.findUnique({
            where: { referralLeadId: lead.leadId }
        })
        if (student) {
            console.log(`  - Linked Student ID: ${student.studentId}`)
            console.log(`  - Student Year: ${student.academicYear}`) // Assuming this is the field name
        } else {
            console.log('  - No linked student found via referralLeadId')

            // Try searching student by admission number or name
            const studentByAdm = await prisma.student.findFirst({
                where: {
                    OR: [
                        { admissionNumber: lead.admissionNumber },
                        { fullName: lead.studentName }
                    ]
                }
            })
            if (studentByAdm) {
                console.log(`  - Found potential student by name/admNo: ${studentByAdm.studentId}`)
                console.log(`  - Student Academic Year: ${(studentByAdm as any).academicYear || (studentByAdm as any).admittedYear}`)
            }
        }
    }

    console.log('--- DIAGNOSIS COMPLETE ---')
}

checkRama().catch(console.error).finally(() => prisma.$disconnect())
