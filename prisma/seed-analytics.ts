
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting Analytics Seeding...')

    // Helper to get a random date within last N days
    const getRandomDate = (daysAgo: number) => {
        const date = new Date()
        date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
        return date
    }

    // 1. Generate Users with Distributed Dates (Growth Trend)
    console.log('Generating 50 Users over last 30 days...')
    const roles = ['Parent', 'Staff']

    for (let i = 0; i < 50; i++) {
        const date = getRandomDate(30)
        const mobile = `70000${String(i).padStart(5, '0')}`
        const code = `ANA-${i}`

        await prisma.user.upsert({
            where: { mobileNumber: mobile },
            update: {},
            create: {
                fullName: `Analytics User ${i + 1}`,
                mobileNumber: mobile,
                role: roles[Math.floor(Math.random() * roles.length)],
                referralCode: code,
                createdAt: date,
                status: 'Active',
                childInAchariya: false,
                yearFeeBenefitPercent: 0,
                longTermBenefitPercent: 0,
                confirmedReferralCount: 0,
                isFiveStarMember: false
            }
        })
    }

    // 2. Generate Leads (Funnel & Campus Performance)
    console.log('Generating 100 Leads...')
    const campuses = [
        "ASM-VILLIANUR(9-12)",
        "ASM-VILLIANUR(MONT-8)",
        "ASM-VILLUPURAM",
        "ASM-ALAPAKKAM",
        "ADYAR"
    ]
    const statuses = ['New', 'Follow-up', 'Confirmed']
    const users = await prisma.user.findMany({ where: { mobileNumber: { startsWith: '70000' } } })

    for (let i = 0; i < 100; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)] as any
        const campus = campuses[Math.floor(Math.random() * campuses.length)]
        const user = users[Math.floor(Math.random() * users.length)]

        await prisma.referralLead.create({
            data: {
                userId: user.userId,
                parentName: `Lead Parent ${i}`,
                parentMobile: `60000${String(i).padStart(5, '0')}`,
                campus: campus,
                gradeInterested: 'Grade 1',
                leadStatus: status,
                studentName: `Lead Child ${i}`,
                createdAt: getRandomDate(15), // Leads in last 15 days
                confirmedDate: status === 'Confirmed' ? new Date() : null
            }
        })
    }

    console.log('✅ Analytics Seeding Complete!')
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
