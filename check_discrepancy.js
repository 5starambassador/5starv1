const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const students = await prisma.student.findMany({
        where: {
            OR: [
                { baseFee: 60000 },
                { annualFee: 60000 }
            ]
        },
        include: {
            referralLead: {
                select: {
                    annualFee: true,
                    selectedFeeType: true
                }
            }
        },
        take: 10
    })

    console.log(JSON.stringify(students.map(s => ({
        studentId: s.studentId,
        fullName: s.fullName,
        baseFee: s.baseFee,
        annualFee: s.annualFee,
        leadFee: s.referralLead?.annualFee
    })), null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
