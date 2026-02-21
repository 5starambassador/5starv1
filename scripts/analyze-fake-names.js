const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('\n🔍 Analyzing fake-named student records in detail...\n')

    // 1. Count by Campus
    const byCampus = await prisma.student.groupBy({
        by: ['campusId'],
        where: { fullName: { endsWith: "'s Child" } },
        _count: { studentId: true }
    })

    const campusIds = byCampus.map(b => b.campusId)
    const campuses = await prisma.campus.findMany({
        where: { id: { in: campusIds } },
        select: { id: true, campusName: true }
    })
    const campusMap = new Map(campuses.map(c => [c.id, c.campusName]))

    console.log('📍 BREAKDOWN BY CAMPUS:')
    console.log('-'.repeat(50))
    let total = 0
    for (const row of byCampus.sort((a, b) => b._count.studentId - a._count.studentId)) {
        const name = campusMap.get(row.campusId) || `Campus ID ${row.campusId}`
        console.log(`  ${name.padEnd(38)} ${row._count.studentId}`)
        total += row._count.studentId
    }
    console.log('-'.repeat(50))
    console.log(`  ${'TOTAL'.padEnd(38)} ${total}`)

    // 2. Check if any are "Referred" (have ambassadorId) vs "Organic"
    const referred = await prisma.student.count({
        where: {
            fullName: { endsWith: "'s Child" },
            ambassadorId: { not: null }
        }
    })
    const organic = await prisma.student.count({
        where: {
            fullName: { endsWith: "'s Child" },
            ambassadorId: null
        }
    })

    console.log('\n📊 REFERRED vs ORGANIC:')
    console.log('-'.repeat(50))
    console.log(`  Organic (no ambassador)           : ${organic}`)
    console.log(`  Referred (has ambassador)         : ${referred}`)
    console.log('-'.repeat(50))

    // 3. Check grade distribution (helps identify if school vs college)
    const byGrade = await prisma.student.groupBy({
        by: ['grade'],
        where: { fullName: { endsWith: "'s Child" } },
        _count: { studentId: true },
        orderBy: { _count: { studentId: 'desc' } },
        take: 15
    })

    console.log('\n📚 TOP GRADES (helps identify school vs college):')
    console.log('-'.repeat(50))
    for (const row of byGrade) {
        console.log(`  ${(row.grade || 'N/A').padEnd(40)} ${row._count.studentId}`)
    }

    // 4. Sample 5 records so user can visually verify
    const samples = await prisma.student.findMany({
        where: { fullName: { endsWith: "'s Child" } },
        include: {
            parent: { select: { fullName: true, mobileNumber: true } },
            campus: { select: { campusName: true } }
        },
        take: 5,
        orderBy: { studentId: 'desc' } // Latest ones
    })

    console.log('\n🔎 SAMPLE RECORDS (5 most recent):')
    console.log('-'.repeat(100))
    console.log('StudentID   Fake Name                           Parent Name              Campus')
    console.log('-'.repeat(100))
    for (const s of samples) {
        console.log(
            `ID:${String(s.studentId).padEnd(8)} ` +
            `${s.fullName.padEnd(36)} ` +
            `${(s.parent?.fullName || 'N/A').padEnd(24)} ` +
            `${s.campus?.campusName || 'N/A'}`
        )
    }
    console.log('-'.repeat(100))
    console.log('\n✅ Analysis complete.\n')
}

main()
    .catch(e => { console.error('❌', e); process.exit(1) })
    .finally(async () => await prisma.$disconnect())
