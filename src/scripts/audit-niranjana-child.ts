import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const niranjana = await prisma.user.findFirst({
        where: { mobileNumber: '9500395309' },
        include: {
            students: {
                include: {
                    campus: true
                }
            }
        }
    })

    if (!niranjana) {
        console.log('Niranjana not found')
        return
    }

    console.log(`--- Ambassador: ${niranjana.fullName} (${niranjana.mobileNumber}) ---`)
    console.log(`User.studentFee (DB): ${niranjana.studentFee}`)
    console.log(`User.childInAchariya: ${niranjana.childInAchariya}`)

    niranjana.students.forEach((s, i) => {
        console.log(`\nChild ${i + 1}: ${s.fullName}`)
        console.log(`  Grade: ${s.grade}, Campus: ${s.campus.name}`)
        console.log(`  Annual Fee (Student Table): ${s.annualFee}`)
        console.log(`  Base Fee (Student Table): ${s.baseFee}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
