const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ✅ SET TO false TO ACTUALLY APPLY THE CHANGES
const DRY_RUN = true

async function main() {
    console.log('\n🔍 Searching for students with fake placeholder names...')
    console.log(DRY_RUN ? '⚠️  DRY RUN MODE — no changes will be saved\n' : '🚨 LIVE MODE — changes WILL be saved to DB\n')

    const fakeNamedStudents = await prisma.student.findMany({
        where: {
            fullName: { endsWith: "'s Child" }
        },
        include: {
            parent: { select: { fullName: true, mobileNumber: true } },
            campus: { select: { campusName: true } }
        },
        orderBy: { studentId: 'asc' }
    })

    if (fakeNamedStudents.length === 0) {
        console.log('✅ No fake-named students found. Database is clean.')
        return
    }

    console.log(`Found ${fakeNamedStudents.length} students with placeholder names:\n`)
    console.log('-'.repeat(110))
    console.log(
        'StudentID'.padEnd(12) +
        'CURRENT FAKE NAME'.padEnd(40) +
        'NEW NAME'.padEnd(35) +
        'CAMPUS'
    )
    console.log('-'.repeat(110))

    let updatedCount = 0
    let skippedCount = 0

    for (const student of fakeNamedStudents) {
        const parentName = student.parent ? student.parent.fullName : null

        if (!parentName) {
            console.log(
                `ID:${String(student.studentId).padEnd(9)}` +
                `${student.fullName.padEnd(40)}` +
                `⚠️  No parent found — SKIPPED`.padEnd(35) +
                (student.campus ? student.campus.campusName : 'N/A')
            )
            skippedCount++
            continue
        }

        const newName = parentName  // Use parent's real name directly

        console.log(
            `ID:${String(student.studentId).padEnd(9)}` +
            `${student.fullName.padEnd(40)}→  ` +
            `${newName.padEnd(33)}` +
            `[${student.campus ? student.campus.campusName : 'N/A'}]`
        )

        if (!DRY_RUN) {
            await prisma.student.update({
                where: { studentId: student.studentId },
                data: { fullName: newName }
            })
            updatedCount++
        }
    }

    console.log('-'.repeat(110))
    console.log('\n📊 Summary:')
    console.log(`   Total with fake names  : ${fakeNamedStudents.length}`)

    if (DRY_RUN) {
        console.log(`   Would be updated       : ${fakeNamedStudents.length - skippedCount}`)
        console.log(`   Would be skipped       : ${skippedCount}`)
        console.log(`\n✅ DRY RUN complete. Review the preview above.`)
        console.log(`   To apply for real: set DRY_RUN = false at the top and run again.\n`)
    } else {
        console.log(`   Updated                : ${updatedCount}`)
        console.log(`   Skipped                : ${skippedCount}`)
        console.log(`\n✅ Cleanup complete!\n`)
    }
}

main()
    .catch(e => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
