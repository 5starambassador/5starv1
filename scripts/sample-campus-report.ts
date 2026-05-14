import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const campusName = "ASM - VILLIANUR"
    
    const referrals = await prisma.referralLead.findMany({
        where: {
            campus: campusName,
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            OR: [
                { admissionFeeCollected: { gt: 0 } },
                { donationFeeCollected: { gt: 0 } }
            ]
        },
        include: { user: true },
        take: 5
    })

    console.log(`SAMPLE REPORT FOR: ${campusName} (WITH COLLECTED FEES)\n`)
    
    const headers = [
        'List', 'Student Name', 'Grade', 'Ambassador', 'Adm Fee', 'Don Fee', 'Adm Share (80%)', 'Don Share (50%)', 'Total Payment'
    ]
    console.log(headers.join(' | '))
    console.log('-'.repeat(140))

    referrals.forEach((ref: any) => {
        const user = ref.user
        const admFee = Number(ref.admissionFeeCollected) || 0
        const donFee = Number(ref.donationFeeCollected) || 0
        
        const admShare = Math.round(admFee * 0.8)
        const donShare = Math.round(donFee * 0.5)
        const total = admShare + donShare

        const row = [
            user.role === 'Staff' ? 'List B' : 'List C',
            ref.studentName || 'N/A',
            ref.gradeInterested || 'N/A',
            user.fullName,
            admFee.toString().padEnd(7),
            donFee.toString().padEnd(7),
            admShare.toString().padEnd(14),
            donShare.toString().padEnd(14),
            total
        ]
        console.log(row.join(' | '))
    })
    
    if (referrals.length === 0) {
        console.log("\n(No non-zero fee records found for this campus in the current sample)")
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
