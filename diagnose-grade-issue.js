const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')

async function main() {
    let report = '=== GRADE MISMATCH DIAGNOSTIC REPORT ===\n\n'

    // 1. Count parents with grade specified
    const parentsWithGrade = await prisma.user.count({
        where: {
            childInAchariya: true,
            role: 'Parent',
            grade: { not: null }
        }
    })
    report += `Parents with child in Achariya AND grade specified: ${parentsWithGrade}\n\n`

    // 2. Find grade mismatches between User.grade and Student.grade
    const mismatches = await prisma.$queryRaw`
        SELECT 
            u."userId", 
            u."fullName" as parent_name, 
            u."grade" as parent_grade, 
            u."childName" as child_name_registered,
            s."studentId", 
            s."fullName" as student_name, 
            s."grade" as student_grade,
            s."createdAt" as student_created
        FROM "User" u
        INNER JOIN "Student" s ON s."parentId" = u."userId"
        WHERE u."grade" IS NOT NULL 
        AND u."grade" != s."grade"
        ORDER BY s."createdAt" DESC
        LIMIT 50
    `

    report += `=== GRADE MISMATCHES FOUND ===\n`
    report += `Total mismatches in first 50 records: ${mismatches.length}\n\n`

    if (mismatches.length > 0) {
        report += 'Sample mismatches:\n'
        mismatches.slice(0, 10).forEach((m, i) => {
            report += `\n${i + 1}. Parent: ${m.parent_name} (ID: ${m.parent_id})\n`
            report += `   Grade at Registration: ${m.parent_grade}\n`
            report += `   Child Name at Registration: ${m.child_name_registered}\n`
            report += `   Student Record: ${m.student_name} - Grade: ${m.student_grade}\n`
            report += `   Student Created: ${m.student_created}\n`
        })
    }

    // 3. Check ReferralLead table for gradeInterested
    const leadGradeCheck = await prisma.$queryRaw`
        SELECT 
            rl."leadId",
            rl."gradeInterested",
            rl."parentName",
            s."grade" as student_grade,
            u."grade" as user_grade
        FROM "ReferralLead" rl
        LEFT JOIN "Student" s ON s."referralLeadId" = rl."leadId"
        LEFT JOIN "User" u ON u."userId" = rl."userId"
        WHERE rl."gradeInterested" IS NOT NULL
        AND s."studentId" IS NOT NULL
        AND rl."gradeInterested" != s."grade"
        LIMIT 20
    `

    report += `\n\n=== REFERRAL LEAD vs STUDENT GRADE MISMATCHES ===\n`
    report += `Cases where ReferralLead.gradeInterested != Student.grade: ${leadGradeCheck.length}\n`
    if (leadGradeCheck.length > 0) {
        report += '\nSamples:\n'
        leadGradeCheck.slice(0, 5).forEach((l, i) => {
            report += `\n${i + 1}. Lead ID: ${l.leadId} - ${l.parentName}\n`
            report += `   ReferralLead.gradeInterested: ${l.gradeInterested}\n`
            report += `   Student.grade: ${l.student_grade}\n`
            report += `   User.grade: ${l.user_grade || 'NULL'}\n`
        })
    }

    // 4. Check for default "1" or "Grade 1" patterns
    const gradeOneStudents = await prisma.student.count({
        where: {
            OR: [
                { grade: '1' },
                { grade: 'Grade 1' },
                { grade: 'Grade - 1' }
            ]
        }
    })

    report += `\n\n=== GRADE "1" PATTERN ANALYSIS ===\n`
    report += `Students with grade "1" or "Grade 1" or "Grade - 1": ${gradeOneStudents}\n`

    // 5. Sample parents who registered with a grade vs their children's actual grade
    const sampleParents = await prisma.user.findMany({
        where: {
            childInAchariya: true,
            role: 'Parent',
            grade: { not: null }
        },
        select: {
            userId: true,
            fullName: true,
            grade: true,
            childName: true,
            createdAt: true,
            students: {
                select: {
                    studentId: true,
                    fullName: true,
                    grade: true,
                    createdAt: true
                }
            }
        },
        take: 10
    })

    report += `\n\n=== SAMPLE PARENT-STUDENT COMPARISON ===\n`
    sampleParents.forEach(parent => {
        report += `\nParent: ${parent.fullName} (Registered: ${parent.createdAt.toLocaleDateString()})\n`
        report += `  Child Name: ${parent.childName || 'N/A'}\n`
        report += `  Grade at Registration: ${parent.grade}\n`
        if (parent.students.length === 0) {
            report += `  ❌ NO STUDENT RECORD YET\n`
        } else {
            parent.students.forEach(student => {
                const match = student.grade === parent.grade ? '✅ MATCH' : '❌ MISMATCH'
                report += `  ${match} Student: ${student.fullName} - Grade: ${student.grade}\n`
            })
        }
    })

    console.log(report)
    fs.writeFileSync('grade-diagnostic-report.txt', report)
    console.log('\n\nReport saved to: grade-diagnostic-report.txt')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
