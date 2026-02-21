const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // 1. Total count
    const total = await prisma.student.count({
        where: { fullName: { endsWith: "'s Child" } }
    })

    // 2. Are they school or college grades?
    const collegeGrades = await prisma.student.count({
        where: {
            fullName: { endsWith: "'s Child" },
            OR: [
                { grade: { contains: 'HONS' } },
                { grade: { contains: 'B.SC' } },
                { grade: { contains: 'B.COM' } },
                { grade: { contains: 'BBA' } },
                { grade: { contains: 'BCA' } },
                { grade: { contains: 'BE' } },
                { grade: { contains: 'MBA' } },
                { grade: { contains: 'MCA' } },
            ]
        }
    })

    const schoolGrades = await prisma.student.count({
        where: {
            fullName: { endsWith: "'s Child" },
            OR: [
                { grade: { contains: 'Grade' } },
                { grade: { contains: 'Class' } },
                { grade: { startsWith: 'LKG' } },
                { grade: { startsWith: 'UKG' } },
                { grade: { startsWith: 'Nursery' } },
            ]
        }
    })

    // 3. Organic vs Referred
    const organic = await prisma.student.count({
        where: { fullName: { endsWith: "'s Child" }, ambassadorId: null }
    })
    const referred = total - organic

    // 4. Campus breakdown
    const byCampus = await prisma.$queryRaw`
        SELECT c."campusName", COUNT(s."studentId")::int as cnt
        FROM "Student" s
        JOIN "Campus" c ON c.id = s."campusId"
        WHERE s."fullName" LIKE '%''s Child'
        GROUP BY c."campusName"
        ORDER BY cnt DESC
    `

    console.log(`\n========================================`)
    console.log(`FAKE-NAME STUDENT ANALYSIS`)
    console.log(`========================================`)
    console.log(`Total fake-named    : ${total}`)
    console.log(`College-level grade : ${collegeGrades}`)
    console.log(`School-level grade  : ${schoolGrades}`)
    console.log(`Organic (no refer.) : ${organic}`)
    console.log(`Referred            : ${referred}`)
    console.log(`\nBy Campus:`)
    for (const row of byCampus) {
        console.log(`  ${row.campusName.padEnd(40)} ${row.cnt}`)
    }
    console.log(`========================================\n`)
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
