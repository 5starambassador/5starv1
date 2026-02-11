const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Starting mass sync of students from leads...')

    const students = await prisma.student.findMany({
        where: {
            referralLeadId: { not: null }
        },
        include: {
            referralLead: true
        }
    })

    console.log(`Found ${students.length} students with linked leads.`)

    let updated = 0
    for (const student of students) {
        const lead = student.referralLead
        if (!lead) continue

        const updateData = {}

        // Sync missing/empty fields
        if (!student.selectedFeeType && lead.selectedFeeType) {
            updateData.selectedFeeType = lead.selectedFeeType
        }

        if ((student.annualFee === null || student.annualFee === undefined) && lead.annualFee) {
            updateData.annualFee = lead.annualFee
        }

        if (student.baseFee === 0 && lead.annualFee) {
            updateData.baseFee = lead.annualFee
        } else if (!student.baseFee && lead.annualFee) {
            updateData.baseFee = lead.annualFee
        }

        if (!student.admissionNumber && lead.admissionNumber) {
            updateData.admissionNumber = lead.admissionNumber
        }

        if (!student.admissionFeeCollected && lead.admissionFeeCollected) {
            updateData.admissionFeeCollected = lead.admissionFeeCollected
        }

        if (!student.donationFeeCollected && lead.donationFeeCollected) {
            updateData.donationFeeCollected = lead.donationFeeCollected
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.student.update({
                where: { studentId: student.studentId },
                data: updateData
            })
            updated++
        }
    }

    console.log(`Finished. Updated ${updated} students.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
