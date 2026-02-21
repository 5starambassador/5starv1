import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Set to TRUE to just preview changes without writing to DB
const DRY_RUN = true

async function main() {
    console.log(`\n🔍 Searching for students with fake placeholder names...`)
    console.log(DRY_RUN ? '⚠️  DRY RUN MODE — no changes will be saved\n' : '🚨 LIVE MODE — changes WILL be saved to database\n')

    // Find all students whose name ends with "'s Child" pattern
    const fakeNamedStudents = await prisma.student.findMany({
        where: {
            fullName: { endsWith: "'s Child" }
        },
        include: {
            parent: { select: { fullName: true, mobileNumber: true } },
            campus: { select: { campusName: true } },
            ambassador: { select: { fullName: true } }
        },
        orderBy: { campusId: 'asc' }
    })

    if (fakeNamedStudents.length === 0) {
        console.log('✅ No fake-named students found. Database is clean.')
        return
    }

    console.log(`Found ${fakeNamedStudents.length} students with placeholder names:\n`)
    console.log('─'.repeat(100))
    console.log(`${'ID'.padEnd(8)} ${'CURRENT (FAKE) NAME'.padEnd(35)} ${'NEW NAME (Parent)'.padEnd(30)} ${'CAMPUS'.padEnd(25)} ${'REFERRAL'}`)
    console.log('─'.repeat(100))

    let updatedCount = 0
    let skippedCount = 0

    for (const student of fakeNamedStudents) {
        const parentName = student.parent?.fullName || null

        if (!parentName) {
            console.log(`${'ID:' + student.studentId}.padEnd(8)} ${student.fullName.padEnd(35)} ${'⚠️  No parent found — SKIPPED'.padEnd(30)} ${student.campus?.campusName || 'N/A'}`)
            skippedCount++
            continue
        }

        // For AASC/college: student IS the parent, so use parent name directly
        // For school campuses: still use parent name as best approximation
        const newName = parentName

        console.log(
            `ID:${String(student.studentId).padEnd(6)} ` +
            `${student.fullName.padEnd(35)} → ` +
            `${newName.padEnd(30)} ` +
            `[${student.campus?.campusName || 'N/A'}] ` +
            `[${student.ambassadorId ? 'Referred' : 'Organic'}]`
        )

        if (!DRY_RUN) {
            await prisma.student.update({
                where: { studentId: student.studentId },
                data: { fullName: newName }
            })
            updatedCount++
        }
    }

    console.log('─'.repeat(100))
    console.log(`\n📊 Summary:`)
    console.log(`   Total with fake names : ${fakeNamedStudents.length}`)

    if (DRY_RUN) {
        console.log(`   Would be updated      : ${fakeNamedStudents.length - skippedCount}`)
        console.log(`   Would be skipped      : ${skippedCount}`)
        console.log(`\n✅ DRY RUN complete. Review the changes above.`)
        console.log(`   To apply, set DRY_RUN = false at the top of this script and run again.`)
    } else {
        console.log(`   Updated               : ${updatedCount}`)
        console.log(`   Skipped               : ${skippedCount}`)
        console.log(`\n✅ Cleanup complete!`)
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
