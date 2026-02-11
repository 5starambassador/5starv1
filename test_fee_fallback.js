
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function getGradeFee(campusId, grade, academicYear = '2025-2026', feeType = 'WOTP') {
    try {
        console.log(`Searching for Campus: ${campusId}, Grade: ${grade}, Year: ${academicYear}, Type: ${feeType}`)
        let gradeFees = await prisma.$queryRawUnsafe(`
            SELECT "annualFee_${feeType.toLowerCase()}" as "fee" FROM "GradeFee" 
            WHERE "campusId" = $1
            AND "grade" = $2
            AND "academicYear" = $3
            LIMIT 1
        `, campusId, grade, academicYear)

        if (gradeFees.length === 0) {
            console.log('Exact match failed. Trying fallback to latest year...')
            gradeFees = await prisma.$queryRawUnsafe(`
                SELECT "annualFee_${feeType.toLowerCase()}" as "fee" FROM "GradeFee" 
                WHERE "campusId" = $1
                AND "grade" = $2
                ORDER BY "academicYear" DESC
                LIMIT 1
            `, campusId, grade)
        }

        if (gradeFees.length > 0) return gradeFees[0].fee
        return null
    } catch (error) {
        console.error('Error fetching grade fee:', error)
        return null
    }
}

async function main() {
    const fee = await getGradeFee(102, 'Grade - 1', '2025-2026', 'WOTP') // Expect fallback
    console.log('Result Fee:', fee)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
