import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const mobile = '+919865643980' // Assuming +91 is the prefix if missing

    console.log(`Checking user with mobile: ${mobile}`)

    const user = await prisma.user.findFirst({
        where: { mobileNumber: { contains: '9865643980' } },
        include: {
            referrals: {
                include: {
                    student: true
                }
            }
        }
    })

    if (!user) {
        console.log('User not found')
        return
    }

    console.log('--- User Details ---')
    console.log(`Full Name: ${user.fullName}`)
    console.log(`Mobile: ${user.mobileNumber}`)
    console.log(`Role: ${user.role}`)
    console.log(`Star Status: ${user.isFiveStarMember ? '5-Star' : 'Normal'}`)
    console.log(`Confirmed Referral Count (Field): ${user.confirmedReferralCount}`)
    console.log(`Academic Year: ${user.academicYear}`)
    console.log(`Assigned Campus: ${user.assignedCampus}`)

    console.log('\n--- Referral Leads (Referral History) ---')
    user.referrals.forEach(r => {
        console.log(`Lead ID: ${r.leadId}`)
        console.log(`Parent Name: ${r.parentName}`)
        console.log(`Student Name: ${r.studentName}`)
        console.log(`Lead Status: ${r.leadStatus}`)
        console.log(`Campus: ${r.campus}`)
        console.log(`Grade Interested: ${r.gradeInterested}`)
        console.log(`Admitted Year: ${r.admittedYear}`)
        if (r.student) {
            console.log(`Linked Student: ${r.student.fullName} (Status: ${r.student.status})`)
        } else {
            console.log('Linked Student: None')
        }
        console.log('---')
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
