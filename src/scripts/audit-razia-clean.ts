import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        where: { fullName: { contains: 'Razia' } },
        include: {
            referrals: true
        }
    })

    console.log(`Found ${users.length} users with name containing 'Razia'`)

    for (const u of users) {
        console.log(`\n--- ${u.fullName} (${u.mobileNumber}) ---`)
        console.log(`ID: ${u.userId}, Role: ${u.role}, Child: ${u.childInAchariya}`)
        u.referrals.forEach(r => {
            console.log(`  Lead: ${r.studentName} (Parent: ${r.parentName})`)
            console.log(`  Status: ${r.leadStatus}, Year: ${r.admittedYear}, Fee: ${r.annualFee}, Campus: ${r.campus}`)
            console.log(`  Adm Collected: ${r.admissionFeeCollected}, Don Collected: ${r.donationFeeCollected}`)
        })
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
