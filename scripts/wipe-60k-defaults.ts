import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Starting Legacy 60k Fee Cleanup...')

    // 1. Cleanup Students
    // We target both baseFee and annualFee (snapshot)
    const studentUpdate = await prisma.student.updateMany({
        where: {
            OR: [
                { baseFee: 60000 },
                { annualFee: 60000 }
            ]
        },
        data: {
            baseFee: 0,
            annualFee: 0
        }
    })
    console.log(`✅ Student records reset to 0: ${studentUpdate.count}`)

    // 2. Cleanup Users
    // Users store their currently assigned student fee for ROI calculations
    const userUpdate = await prisma.user.updateMany({
        where: { studentFee: 60000 },
        data: { studentFee: 0 }
    })
    console.log(`✅ User records reset to 0: ${userUpdate.count}`)

    // 3. Cleanup GradeFees
    // Ensuring no "Placeholder" 60k records exist in the fee configuration table
    const gradeFeeUpdate = await prisma.gradeFee.updateMany({
        where: {
            OR: [
                { annualFee_otp: 60000 },
                { annualFee_wotp: 60000 }
            ]
        },
        data: {
            annualFee_otp: 0,
            annualFee_wotp: 0
        }
    })
    console.log(`✅ GradeFee records reset to 0: ${gradeFeeUpdate.count}`)

    console.log('✨ Cleanup complete. All 60k fallbacks in DB have been neutralized.')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
