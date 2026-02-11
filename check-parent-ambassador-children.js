const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')

async function main() {
    let report = '=== PARENT AMBASSADOR CHILDREN GRADE CHECK ===\n\n'

    // Find parent ambassadors whose OWN children have grade mismatches
    const parentAmbassadors = await prisma.user.findMany({
        where: {
            role: 'Parent',
            childInAchariya: true,
            grade: { not: null },
            students: {
                some: {}  // Has at least one student record
            }
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            grade: true,  // Grade they entered during registration
            childName: true,  // Child name they entered during registration
            campusId: true,
            assignedCampus: true,
            createdAt: true,
            students: {
                select: {
                    studentId: true,
                    fullName: true,
                    grade: true,  // Actual grade in student record
                    campusId: true,
                    createdAt: true,
                    referralLeadId: true
                }
            }
        },
        take: 100
    })

    report += `Total Parent Ambassadors with children enrolled: ${parentAmbassadors.length}\n\n`

    // Categorize the findings
    let perfectMatches = 0
    let mismatches = []
    let multipleChildren = []

    parentAmbassadors.forEach(parent => {
        const allMatch = parent.students.every(s => s.grade === parent.grade)

        if (parent.students.length > 1) {
            multipleChildren.push(parent)
        }

        if (allMatch) {
            perfectMatches++
        } else {
            mismatches.push(parent)
        }
    })

    report += `✅ Perfect Matches (Parent grade = Student grade): ${perfectMatches}\n`
    report += `❌ Mismatches (Parent grade ≠ Student grade): ${mismatches.length}\n`
    report += `👥 Parents with multiple children: ${multipleChildren.length}\n\n`

    report += `=== DETAILED MISMATCH CASES ===\n\n`

    mismatches.slice(0, 20).forEach((parent, i) => {
        report += `${i + 1}. PARENT: ${parent.fullName} (ID: ${parent.userId})\n`
        report += `   Mobile: ${parent.mobileNumber}\n`
        report += `   Registered: ${parent.createdAt.toLocaleDateString()}\n`
        report += `   Campus: ${parent.assignedCampus || 'N/A'}\n`
        report += `   Grade at Registration: "${parent.grade}"\n`
        report += `   Child Name at Registration: ${parent.childName || 'N/A'}\n`
        report += `   \n`
        report += `   STUDENT RECORDS:\n`
        parent.students.forEach((student, j) => {
            const match = student.grade === parent.grade ? '✅' : '❌'
            report += `   ${j + 1}. ${match} ${student.fullName}\n`
            report += `      Grade in DB: "${student.grade}"\n`
            report += `      Created: ${student.createdAt.toLocaleDateString()}\n`
            report += `      Referral Lead ID: ${student.referralLeadId || 'Direct Entry'}\n`
        })
        report += `\n`
    })

    // Check for the specific "Grade 1" pattern
    report += `\n=== PARENTS WHO REGISTERED WITH "Grade 1" ===\n\n`

    const grade1Parents = parentAmbassadors.filter(p =>
        p.grade === 'Grade 1' || p.grade === '1' || p.grade === 'Grade - 1'
    )

    report += `Parents who registered with "Grade 1" (or variant): ${grade1Parents.length}\n\n`

    grade1Parents.slice(0, 15).forEach((parent, i) => {
        report += `${i + 1}. ${parent.fullName}\n`
        report += `   Registered Grade: "${parent.grade}"\n`
        parent.students.forEach(student => {
            const match = student.grade.includes('1') || student.grade === parent.grade ? '✅' : '❌ WRONG'
            report += `   ${match} Student: ${student.fullName} - Grade: "${student.grade}"\n`
        })
        report += `\n`
    })

    // Summary statistics
    report += `\n=== SUMMARY ===\n`
    report += `Total Parent Ambassadors Analyzed: ${parentAmbassadors.length}\n`
    report += `Match Rate: ${((perfectMatches / parentAmbassadors.length) * 100).toFixed(1)}%\n`
    report += `Mismatch Rate: ${((mismatches.length / parentAmbassadors.length) * 100).toFixed(1)}%\n`

    console.log(report)
    fs.writeFileSync('parent-ambassador-children-report.txt', report)
    console.log('\n\nReport saved to: parent-ambassador-children-report.txt')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
