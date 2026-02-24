
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DATA AUDIT: ACADEMIC YEAR ---')

    const leads = await prisma.referralLead.findMany({
        select: {
            leadId: true,
            academicYear: true,
            admittedYear: true,
            leadStatus: true
        }
    })

    const yearDistribution: Record<string, number> = {}
    let totalMissing = 0
    let totalEmpty = 0

    leads.forEach(l => {
        const yr = l.academicYear || 'MISSING'
        yearDistribution[yr] = (yearDistribution[yr] || 0) + 1
        if (yr === 'MISSING') totalMissing++
        if (yr === '') totalEmpty++
    })

    console.log('ReferralLead Academic Year Distribution:', yearDistribution)
    console.log('Total Missing:', totalMissing)
    console.log('Total Empty String:', totalEmpty)

    const mismatches = leads.filter(l => l.admittedYear && l.admittedYear !== l.academicYear)
    console.log('ReferralLeads with admittedYear mismatching academicYear:', mismatches.length)
    if (mismatches.length > 0) {
        console.log('First 5 mismatches:', mismatches.slice(0, 5))
    }

    const students = await prisma.student.findMany({
        select: {
            studentId: true,
            fullName: true,
            academicYear: true
        }
    })

    const studentYearDist: Record<string, number> = {}
    const anomalousStudents: any[] = []
    students.forEach(s => {
        const yr = s.academicYear || 'MISSING'
        studentYearDist[yr] = (studentYearDist[yr] || 0) + 1
        if (!['2024-2025', '2025-2026', '2026-2027'].includes(yr)) {
            anomalousStudents.push(s)
        }
    })

    console.log('Student Academic Year Distribution:', studentYearDist)
    console.log('Anomalous Students Found:', anomalousStudents.length)
    if (anomalousStudents.length > 0) {
        console.log('Anomalous Student IDs:', anomalousStudents.map(s => `${s.studentId} (${s.fullName}: ${s.academicYear})`))
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
