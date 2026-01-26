
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Debugging Fee Records ---')

    // 1. Check available Academic Years
    const years = await prisma.gradeFee.groupBy({
        by: ['academicYear'],
        _count: true
    })
    console.log('Available Academic Years:', years)

    // 2. Check sample records for a campus
    // Let's try to find a campus first
    const campus = await prisma.campus.findFirst()
    if (!campus) {
        console.log('No campuses found')
        return
    }
    console.log(`Checking fees for Campus: ${campus.campusName} (${campus.id})`)

    const fees = await prisma.gradeFee.findMany({
        where: { campusId: campus.id },
        take: 5
    })
    console.log('Sample Fee Records:', fees)

    // 3. Check for specific lookup failure simulation
    // Try to find what the user might be looking for
    // Assuming user might send "SSV - VILLIANUR" or similar
    const checkCampusName = 'SSV - VILLIANUR'
    const checkGrade = 'Grade-8' // Common format

    console.log(`\nSimulating lookup for [${checkCampusName}] + [${checkGrade}]...`)
    const targetCampus = await prisma.campus.findUnique({ where: { campusName: checkCampusName } })
    if (!targetCampus) {
        console.log('-> Campus NOT FOUND by name')
    } else {
        console.log('-> Campus FOUND:', targetCampus.id)
        const record = await prisma.gradeFee.findFirst({
            where: {
                campusId: targetCampus.id,
                grade: checkGrade,
                academicYear: '2025-2026'
            }
        })
        console.log('-> Fee Record:', record || 'NOT FOUND')

        if (!record) {
            console.log('-> checking what grades DO exist for this campus/year...')
            const existing = await prisma.gradeFee.findMany({
                where: { campusId: targetCampus.id, academicYear: '2025-2026' },
                select: { grade: true }
            })
            console.log('-> Available Grades:', existing.map(e => e.grade))
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
