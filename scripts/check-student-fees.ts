
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const mobiles = ["7598326022", "7708838990", "8248764961", "9003977098", "9047585092", "9597150068"]

        console.log('--- Student Fee Details ---')
        const students = await prisma.student.findMany({
            where: {
                parent: {
                    mobileNumber: { contains: mobiles[0].slice(-5) } // Sample
                }
            },
            include: { parent: true }
        })

        // Search for all
        const allStudents = await prisma.student.findMany({
            where: {
                parent: {
                    OR: mobiles.map(m => ({ mobileNumber: { contains: m.slice(-10) } }))
                }
            },
            include: { parent: true }
        })

        for (const s of allStudents) {
            console.log(`Student: ${s.fullName} | Parent: ${s.parent.fullName} | baseFee: ${s.baseFee} | annualFee: ${(s as any).annualFee}`)
        }

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
