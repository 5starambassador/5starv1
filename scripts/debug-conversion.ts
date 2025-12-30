
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function debug() {
    try {
        const lead = await prisma.referralLead.findFirst({
            where: { parentMobile: '2315452211' },
            include: { user: true, student: true }
        })

        console.log('--- LEAD DETAILS ---')
        console.log(JSON.stringify(lead, null, 2))

        if (lead) {
            const parentUser = await prisma.user.findFirst({
                where: { mobileNumber: lead.parentMobile }
            })
            console.log('--- PARENT USER DETAILS ---')
            console.log(JSON.stringify(parentUser, null, 2))

            if (lead.campus) {
                const campus = await prisma.campus.findUnique({
                    where: { campusName: lead.campus }
                })
                console.log('--- CAMPUS DETAILS ---')
                console.log(JSON.stringify(campus, null, 2))
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

debug()
