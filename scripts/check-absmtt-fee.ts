
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
    const fee = await prisma.gradeFee.findFirst({
        where: {
            campus: { campusName: 'ABSM - THENGAITHITTU' },
            grade: { in: ['Grade - 1', 'Grade-1', 'Grade 1'] },
            academicYear: '2026-2027'
        }
    })
    console.log(JSON.stringify(fee, null, 2))
}

check().catch(console.error).finally(() => prisma.$disconnect())
