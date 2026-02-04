
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkMont1() {
    try {
        const campusId = 100
        const grade = "Mont - 1"

        console.log(`Checking GradeFee for Campus ID: ${campusId} and Grade: "${grade}"`)

        const fee = await prisma.gradeFee.findFirst({
            where: {
                campusId: campusId,
                grade: grade
            }
        })

        if (fee) {
            console.log("SUCCESS: Found fee for Mont - 1:", JSON.stringify(fee, null, 2))
        } else {
            console.log("FAILURE: Fee not found for Mont - 1")
        }

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

checkMont1()
