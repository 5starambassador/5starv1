import prisma from '../src/lib/prisma'

async function checkCounts() {
    try {
        const [
            users,
            students,
            leads,
            admins,
            campuses,
            gradeFees,
            activityLogs
        ] = await Promise.all([
            prisma.user.count(),
            prisma.student.count(),
            prisma.referralLead.count(),
            prisma.admin.count(),
            prisma.campus.count(),
            prisma.gradeFee.count(),
            prisma.activityLog.count()
        ])

        console.log('--- Database Counts ---')
        console.log('Users:', users)
        console.log('Students:', students)
        console.log('Leads:', leads)
        console.log('Admins:', admins)
        console.log('Campuses:', campuses)
        console.log('GradeFees:', gradeFees)
        console.log('ActivityLogs:', activityLogs)
    } catch (error) {
        console.error('Error checking counts:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkCounts()
