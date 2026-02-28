
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const ids = [914, 894, 883]
        for (const id of ids) {
            const l = await prisma.referralLead.findUnique({
                where: { leadId: id },
                select: { leadId: true, leadStatus: true, admittedYear: true, academicYear: true, campus: true, gradeInterested: true }
            })
            console.log(`Lead ${id}: Status=${l?.leadStatus}, AdmittedY=${l?.admittedYear}, AcademicY=${l?.academicYear}, Campus=${l?.campus}`)
        }

        const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
        console.log(`Current Sys Year: ${currentYear?.year}`)

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
