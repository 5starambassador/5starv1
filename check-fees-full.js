
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkFeesFull() {
    try {
        const campusId = 100 // Verified ID for ASM HSC - VILLIANUR
        const grade = "Mont - I"

        console.log(`Checking GradeFee for Campus ID: ${campusId} and Grade: "${grade}"`)

        const fees = await prisma.gradeFee.findMany({
            where: {
                campusId: campusId
            }
        })

        console.log(`Total Fees found: ${fees.length}`)

        // Check for specific grade
        const gradeFees = fees.filter(f => f.grade === grade)
        if (gradeFees.length > 0) {
            console.log("Found fees for grade:", JSON.stringify(gradeFees, null, 2))
        } else {
            console.log("No fees found for this grade.")
            // List available grades
            const availableGrades = [...new Set(fees.map(f => f.grade))]
            console.log("Available grades:", availableGrades.join(', '))
        }

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

checkFeesFull()
