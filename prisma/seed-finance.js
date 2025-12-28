
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Finance Data (JS Mode)...')

    // 1. Ensure Campuses (needed for GradeFee)
    let campuses = await prisma.campus.findMany()

    if (campuses.length === 0) {
        console.log('No campuses found, creating dummy campus...')
        const c = await prisma.campus.create({
            data: {
                campusName: "ASM-MAIN-DUMMY",
                campusCode: "DUMMY-001",
                location: "Main",
                grades: "K-12"
            }
        })
        campuses = [c]
    } else {
        console.log(`Found ${campuses.length} existing campuses. Using them.`)
    }

    // 2. Grade Fees
    console.log('Seeding Grade Fees...')
    await prisma.gradeFee.deleteMany({}) // Clean slate for fees

    const GRADES = ['KG 1', 'KG 2', 'Grade 1', 'Grade 5', 'Grade 10', 'Grade 12']

    for (const campus of campuses) {
        for (const grade of GRADES) {
            let baseFee = 45000
            if (grade.includes('Grade')) baseFee = 65000
            if (grade.includes('10') || grade.includes('12')) baseFee = 85000

            await prisma.gradeFee.create({
                data: {
                    campusId: campus.id,
                    grade: grade,
                    annualFee: baseFee
                }
            })
        }
    }

    // 3. Settlements
    console.log('Seeding Settlements...')
    const users = await prisma.user.findMany({ take: 5 })

    if (users.length > 0) {
        await prisma.settlement.deleteMany({
            where: {
                userId: { in: users.map(u => u.userId) }
            }
        })

        for (const user of users) {
            // Pending Settlement
            await prisma.settlement.create({
                data: {
                    userId: user.userId,
                    amount: 5000 + Math.floor(Math.random() * 5000),
                    status: 'Pending',
                    remarks: 'Referral Bonus Q1'
                }
            })

            // Processed Settlement
            await prisma.settlement.create({
                data: {
                    userId: user.userId,
                    amount: 2000,
                    status: 'Processed',
                    paymentMethod: 'Bank Transfer',
                    processedBy: 1,
                    payoutDate: new Date()
                }
            })
        }
    } else {
        console.log('No users to attach settlements to.')
    }

    console.log('Finance Seed Completed.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
