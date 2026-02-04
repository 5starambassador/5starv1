
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkFees() {
    try {
        const campusName = 'ASM - VILLIANUR'
        const grade = 'Mont - I'

        console.log(`Checking fees for Campus: "${campusName}", Grade: "${grade}"`)

        // 1. Check Campus Code mapping if any (getGradeFee logic usually does this)
        // Let's check typical fee entries
        const fees = await prisma.feeStructure.findMany({
            where: {
                campus: {
                    contains: 'VILLIANUR', // Loose search
                    mode: 'insensitive'
                }
            }
        })

        console.log('Found Fee Structures for Villianur:', fees.length)
        if (fees.length > 0) {
            console.log('Sample Fee:', fees[0])
            // Check specific grade match
            const match = fees.find(f => f.grade === grade && f.campus === campusName)
            if (match) {
                console.log('EXACT MATCH FOUND:', match)
            } else {
                console.log('NO EXACT MATCH. Available Grades:', fees.map(f => f.grade))
                console.log('Available Campuses:', fees.map(f => f.campus))
            }
        }

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

checkFees()
