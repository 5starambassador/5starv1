import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DEEP YEAR-BY-YEAR ACTIVITY AUDIT ---')

    const users = await prisma.user.findMany({
        include: {
            referrals: {
                select: { admittedYear: true }
            }
        }
    })

    const cohorts = {
        '2024_Only': 0,
        '2025_Only': 0,
        '2026_Only': 0,
        'Mixed_24_25': 0,
        'Mixed_25_26': 0,
        'Mixed_All': 0,
        'No_Activity': 0
    }

    const mappingProjections: Record<string, number> = {
        '2024-2025': 0,
        '2025-2026': 0,
        '2026-2027': 0
    }

    users.forEach(u => {
        const years = Array.from(new Set(u.referrals.map(r => r.admittedYear).filter(Boolean)))

        if (years.length === 0) {
            cohorts['No_Activity']++
            const created = new Date(u.createdAt)
            if (created < new Date('2025-06-01')) mappingProjections['2024-2025']++
            else if (created < new Date('2026-02-01')) mappingProjections['2025-2026']++
            else mappingProjections['2026-2027']++
            return
        }

        const has24 = years.includes('2024-2025')
        const has25 = years.includes('2025-2026')
        const has26 = years.includes('2026-2027')

        if (has24 && !has25 && !has26) cohorts['2024_Only']++
        else if (!has24 && has25 && !has26) cohorts['2025_Only']++
        else if (!has24 && !has25 && has26) cohorts['2026_Only']++
        else if (has24 && has25 && !has26) cohorts['Mixed_24_25']++
        else if (!has24 && has25 && has26) cohorts['Mixed_25_26']++
        else cohorts['Mixed_All']++

        if (has26) mappingProjections['2026-2027']++
        else if (has25) mappingProjections['2025-2026']++
        else if (has24) mappingProjections['2024-2025']++
    })

    console.log('\nAmbassador Cohort Breakdown:')
    console.table(cohorts)

    console.log('\n"Simple & Smart" Mapping Projection (Anchor to Most Recent Activity):')
    console.table(mappingProjections)

    const mismatchedRefs = await prisma.referralLead.count({
        where: {
            OR: [
                { academicYear: '2026-2027', admittedYear: '2025-2026' },
                { academicYear: '2026-2027', admittedYear: '2024-2025' },
                { academicYear: '2025-2026', admittedYear: '2024-2025' }
            ]
        }
    })

    console.log(`\nReferrals needing Year Fix (Year bleed-over): ${mismatchedRefs}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
