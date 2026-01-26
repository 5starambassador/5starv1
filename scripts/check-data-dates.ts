import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('📅 Checking Data Distribution by Date...')

    // 1. Group Referrals by Created Date (Day)
    const referrals = await prisma.referralLead.findMany({
        select: { createdAt: true }
    })

    const referralCounts: Record<string, number> = {}
    referrals.forEach(r => {
        const date = r.createdAt.toISOString().split('T')[0]
        referralCounts[date] = (referralCounts[date] || 0) + 1
    })

    console.log('\n--- Referral Leads per Day ---')
    const sortedReferralDates = Object.keys(referralCounts).sort().reverse().slice(0, 10)
    sortedReferralDates.forEach(date => {
        console.log(`${date}: ${referralCounts[date]} leads`)
    })

    // 2. Group Students by Created Date
    const students = await prisma.student.findMany({
        select: { createdAt: true }
    })

    const studentCounts: Record<string, number> = {}
    students.forEach(s => {
        const date = s.createdAt.toISOString().split('T')[0]
        studentCounts[date] = (studentCounts[date] || 0) + 1
    })

    console.log('\n--- Students per Day ---')
    const sortedStudentDates = Object.keys(studentCounts).sort().reverse().slice(0, 10)
    sortedStudentDates.forEach(date => {
        console.log(`${date}: ${studentCounts[date]} students`)
    })

    // 3. Check Recent Activity Function (mimic)
    console.log('\n--- Recent Activity Check ---')
    const recent = await prisma.referralLead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { leadId: true, createdAt: true, studentName: true, parentName: true }
    })
    console.table(recent.map(r => ({
        id: r.leadId,
        date: r.createdAt.toISOString().split('T')[0],
        name: r.studentName || r.parentName
    })))
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
