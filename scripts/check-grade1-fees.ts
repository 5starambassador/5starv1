
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkGrade1Fees() {
    console.log('--- CHECKING GRADE - 1 FEES ---')
    const fees = await prisma.gradeFee.findMany({
        where: {
            grade: { in: ['Grade - 1', 'Grade-1', 'Grade 1'] },
            academicYear: '2026-2027'
        },
        include: { campus: true }
    })
    console.log(JSON.stringify(fees, null, 2))
    console.log('--- CHECK COMPLETE ---')
}

checkGrade1Fees().catch(console.error).finally(() => prisma.$disconnect())
