
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Academic Years ---')
        const years = await prisma.academicYear.findMany()
        console.log(JSON.stringify(years, null, 2))

        const leadIds = [914, 894, 883, 882, 881, 854, 749, 748, 747, 637, 600, 596]

        console.log('\n--- Leads Analysis ---')
        const leads = await prisma.referralLead.findMany({
            where: { leadId: { in: leadIds } },
            include: {
                student: true,
                user: {
                    select: {
                        userId: true,
                        fullName: true,
                        referralCode: true,
                        role: true
                    }
                }
            }
        })

        leads.forEach(l => {
            console.log(`Lead ID: ${l.leadId} | Status: ${l.leadStatus} | AdmittedYear: ${l.admittedYear} | AcademicYear: ${l.academicYear} | Referrer: ${l.user?.fullName} (${l.user?.referralCode})`)
            if (l.student) {
                console.log(`  -> Student: ${l.student.fullName} | Year: ${l.student.academicYear} | Fee: ${l.student.annualFee}`)
            } else {
                console.log(`  -> No student record found`)
            }
        })

        console.log('\n--- Referrer Context ---')
        const referrers = Array.from(new Set(leads.map(l => l.userId)))
        for (const rid of referrers) {
            const user = await prisma.user.findUnique({
                where: { userId: rid },
                select: { userId: true, fullName: true, role: true, isFiveStarMember: true, studentFee: true }
            })
            if (user) {
                console.log(`User: ${user.fullName} | Role: ${user.role} | 5-Star: ${user.isFiveStarMember} | Fee: ${user.studentFee}`)
            } else {
                console.log(`User ID ${rid} not found`)
            }
        }
    } catch (err) {
        console.error('Script Error:', err)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
