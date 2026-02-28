
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Diagnostic for Aswini J (9551031245) ---')

        // 1. Fetch the User
        const user = await prisma.user.findFirst({
            where: { mobileNumber: '9551031245' },
            include: {
                students: true,
                referrals: {
                    where: { leadId: 860 }
                }
            }
        })

        if (!user) {
            console.log('User not found')
            return
        }

        console.log(`User: ${user.fullName} | Role: ${user.role} | ChildName (DB): ${user.childName}`)
        console.log(`Linked Students (${user.students.length}):`)
        user.students.forEach(s => {
            console.log(`  - Student: ${s.fullName} | ERP: ${s.erpNo} | Status: ${s.status}`)
        })

        // 2. Fetch the specific Lead 860
        const lead = await prisma.referralLead.findUnique({
            where: { leadId: 860 },
            include: {
                student: true
            }
        })

        if (lead) {
            console.log(`\nReferral Lead 860:`)
            console.log(`  - Student Name: ${lead.studentName}`)
            console.log(`  - Status: ${lead.leadStatus}`)
            console.log(`  - Mobile: ${lead.studentMobile}`)
            console.log(`  - Parent: ${lead.parentName} (${lead.parentMobile})`)
            console.log(`  - Academic Year: ${lead.academicYear}`)
            if (lead.student) {
                console.log(`  - Linked Student Record: ${lead.student.fullName} (ERP: ${lead.student.erpNo})`)
            }
        } else {
            console.log('\nLead 860 not found')
        }

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
