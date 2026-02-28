
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const mobiles = ["7598326022", "7708838990", "8248764961", "9003977098", "9047585092", "9597150068"]

        console.log('--- Targeted Referrals Year Check ---')
        const users = await prisma.user.findMany({
            where: {
                OR: mobiles.map(m => ({ mobileNumber: { contains: m.slice(-10) } }))
            },
            include: {
                referrals: true
            }
        })

        for (const u of users) {
            console.log(`\nAmbassador: ${u.fullName} (${u.role})`)
            u.referrals.forEach(r => {
                console.log(`- Lead ${r.leadId}: Status=${r.leadStatus} | AdmittedY=${r.admittedYear} | Created=${r.createdAt.toISOString()}`)
            })
        }

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
