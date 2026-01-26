import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🕵️ Verifying All Campus Head Logins & Data Visibility...')

    // 1. Get all Campus Heads
    const campusHeads = await prisma.admin.findMany({
        where: { role: 'Campus_Head' },
        select: { adminId: true, adminName: true, assignedCampus: true }
    })

    console.log(`\nFound ${campusHeads.length} Campus Head Accounts.`)

    const results = []

    for (const head of campusHeads) {
        const result: any = {
            adminName: head.adminName,
            assignedString: head.assignedCampus,
            status: '✅ OK',
            campusId: null,
            userCount: 0,
            notes: ''
        }

        if (!head.assignedCampus) {
            result.status = '❌ MISSING ASSIGNMENT'
            results.push(result)
            continue
        }

        // 2. Resolve Campus
        // Note: verifyCampusAccess logic generally looks up by campusName
        const campus = await prisma.campus.findUnique({
            where: { campusName: head.assignedCampus }
        })

        if (!campus) {
            // Try fuzzy match to help debug
            const fuzzy = await prisma.campus.findFirst({
                where: { campusName: { contains: head.assignedCampus.trim() } }
            })
            if (fuzzy) {
                result.status = '⚠️ MISMATCH'
                result.notes = `Did you mean "${fuzzy.campusName}"?`
            } else {
                result.status = '❌ INVALID CAMPUS'
                result.notes = 'Campus string does not exist in Campus table'
            }
        } else {
            result.campusId = campus.id

            // 3. Check Data Visibility (User Count)
            // The actions uses: where: { assignedCampus: access.campusName }
            const userCount = await prisma.user.count({
                where: { assignedCampus: head.assignedCampus }
            })
            result.userCount = userCount

            if (userCount === 0) {
                result.status = '⚠️ NO DATA'
                result.notes = 'Login works, but 0 users found.'
            }
        }
        results.push(result)
    }

    // Sort: Errors first, then Warnings, then OK
    results.sort((a, b) => {
        const score = (s: string) => s.startsWith('❌') ? 0 : s.startsWith('⚠️') ? 1 : 2
        return score(a.status) - score(b.status)
    })

    // console.table(results) // Too large

    // Only show non-OK
    const issues = results.filter(r => r.status !== '✅ OK')
    if (issues.length > 0) {
        console.log('\n⚠️ Issues Found:')
        console.table(issues)
    } else {
        console.log('\n✅ All clean! No issues found.')
    }

    // Summary
    const errors = results.filter(r => r.status.startsWith('❌'))
    const warnings = results.filter(r => r.status.startsWith('⚠️'))

    console.log(`\nSummary:`)
    console.log(`Total Checked: ${results.length}`)
    console.log(`Errors (Invalid/Missing): ${errors.length}`)
    console.log(`Warnings (Mismatch/No Data): ${warnings.length}`)
    console.log(`OK: ${results.filter(r => r.status.startsWith('✅')).length}`)

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
