
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkGrades() {
    console.log('--- CHECKING UNIQUE GRADES ---')
    const grades = await prisma.gradeFee.findMany({
        select: { grade: true },
        distinct: ['grade']
    })
    console.log(JSON.stringify(grades, null, 2))

    // Also check for 'Grade 1' specifically to see the fee
    const grade1Fees = await prisma.gradeFee.findMany({
        where: { grade: { contains: 'Grade', mode: 'insensitive' } },
        take: 10
    })
    console.log('Sample Grade Fees:', JSON.stringify(grade1Fees, null, 2))

    console.log('--- CHECK COMPLETE ---')
}

checkGrades().catch(console.error).finally(() => prisma.$disconnect())
