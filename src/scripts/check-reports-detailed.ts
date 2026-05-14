import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Detailed Reporting Audit ---')
    try {
        const campuses = await prisma.campus.findMany({
            where: { isActive: true }
        })

        console.log(`\nActive Campuses (${campuses.length}):`)
        for (const campus of campuses) {
            console.log(`- ${campus.campusName} (Email: ${campus.contactEmail || 'MISSING'}, Phone: ${campus.contactPhone || 'MISSING'})`)
        }

        const now = new Date()
        const dailyStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const recentReferrals = await prisma.referralLead.findMany({
            where: {
                leadStatus: { in: ['Confirmed', 'Admitted'] },
                confirmedDate: { gte: weeklyStart }
            },
            select: {
                leadId: true,
                campus: true,
                leadStatus: true,
                confirmedDate: true,
                studentName: true
            }
        })

        console.log(`\nRecent Confirmed/Admitted Referrals (Last 7 Days): ${recentReferrals.length}`)
        const campusStats: Record<string, number> = {}
        const dailyStats: Record<string, number> = {}

        for (const ref of recentReferrals) {
            const cName = ref.campus || 'N/A'
            campusStats[cName] = (campusStats[cName] || 0) + 1
            if (ref.confirmedDate && ref.confirmedDate >= dailyStart) {
                dailyStats[cName] = (dailyStats[cName] || 0) + 1
            }
        }

        console.log('\nReferrals by Campus (Last 7 Days):')
        Object.entries(campusStats).forEach(([name, count]) => {
            const campusExists = campuses.some(c => c.campusName === name)
            console.log(`- ${name}: ${count} leads ${campusExists ? '' : '⚠️ (Campus Name mismatch or Inactive)'}`)
        })

        console.log('\nReferrals by Campus (Last 24 Hours):')
        Object.entries(dailyStats).forEach(([name, count]) => {
            console.log(`- ${name}: ${count} leads`)
        })

        // Check for common pitfalls
        console.log('\nDiagnostics:')
        const missingEmails = campuses.filter(c => !c.contactEmail).map(c => c.campusName)
        if (missingEmails.length > 0) {
            console.log(`❌ ERROR: These active campuses are missing contact emails: ${missingEmails.join(', ')}`)
        }

        const unknownCampuses = Object.keys(campusStats).filter(name => !campuses.some(c => c.campusName === name))
        if (unknownCampuses.length > 0) {
            console.log(`⚠️ WARNING: These campus names in ReferralLead don't match any active Campus table entry: ${unknownCampuses.join(', ')}`)
        }

        const logs = await prisma.activityLog.findMany({
            where: {
                action: { contains: 'Report' }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        })
        console.log('\nRecent Report Logs:')
        logs.forEach(l => console.log(`- ${l.createdAt.toISOString()}: ${l.action} - ${l.description}`))

    } catch (error) {
        console.error('Audit Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
