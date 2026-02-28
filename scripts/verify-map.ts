
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const mobiles = ["7598326022", "7708838990", "8248764961", "9003977098", "9047585092", "9597150068"]
        const academicYear = "2026-2027"

        console.log('--- GradeFee Map Verification ---')
        const gradeFees = await prisma.gradeFee.findMany({
            where: {
                grade: { in: ['Grade - 1', 'Grade-1', 'Grade 1'] },
                academicYear: academicYear
            }
        })

        const map = new Map()
        gradeFees.forEach(gf => map.set(gf.campusId, gf.annualFee_wotp))

        console.log('Grade 1 Fee Map Keys (Campus IDs):', Array.from(map.keys()))
        console.log('Map entries:', Array.from(map.entries()))

        const users = await prisma.user.findMany({
            where: { OR: mobiles.map(m => ({ mobileNumber: { contains: m.slice(-10) } })) },
            include: { referrals: { where: { leadStatus: { in: ['Confirmed', 'Admitted'] }, admittedYear: academicYear } } }
        })

        for (const u of users) {
            console.log(`\nUser: ${u.fullName}`)
            for (const r of u.referrals) {
                const mappedFee = map.get(r.campusId)
                console.log(`- Lead ${r.leadId}: CampusId=${r.campusId} | MappedFee=${mappedFee}`)
            }
        }

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
