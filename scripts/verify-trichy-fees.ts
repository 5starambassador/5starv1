
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const year = "2026-2027"
        console.log(`--- Checking Fees for Trichy: ${year} ---`)

        const trichy = await prisma.campus.findFirst({
            where: { campusName: { contains: 'Trichy', mode: 'insensitive' } }
        })

        if (!trichy) {
            console.log('Trichy campus not found')
            return
        }

        console.log(`Campus: ${trichy.campusName} | ID: ${trichy.id}`)

        const fees = await prisma.gradeFee.findMany({
            where: { campusId: trichy.id, academicYear: year }
        })

        console.log(`Fees found: ${fees.length}`)
        fees.forEach(f => console.log(`  - Grade: ${f.grade} | OTP: ${f.annualFee_otp} | WOTP: ${f.annualFee_wotp}`))

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
