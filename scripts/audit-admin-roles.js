const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function auditAdmins() {
    console.log('Starting Admin Data Audit...')
    console.log('--------------------------------')

    const admins = await prisma.admin.findMany({
        orderBy: { createdAt: 'desc' }
    })

    const summary = {
        total: admins.length,
        byRole: {},
        suspects: []
    }

    // Initialize counts
    const roles = ['Super Admin', 'Finance Admin', 'Campus Head', 'Campus Admin', 'Admission Admin']
    roles.forEach(r => summary.byRole[r] = 0)

    for (const admin of admins) {
        // Normalize role string (Prisma returns the enum value, e.g. 'Campus_Head')
        // We need to map it to readable or check raw
        const role = admin.role.replace(/_/g, ' ')

        if (summary.byRole[role] !== undefined) {
            summary.byRole[role]++
        } else {
            summary.byRole[role] = 1
        }

        // Check for anomalies
        let anomaly = null

        // 1. Campus Roles MUST have an assigned campus
        if ((role === 'Campus Head' || role === 'Campus Admin') && !admin.assignedCampus) {
            anomaly = 'Missing Assigned Campus'
        }

        // 2. "Admission Admin" SHOULD NOT have an assigned campus (usually global)
        // If they do, they might be a mis-classified Campus Admin
        if (role === 'Admission Admin' && admin.assignedCampus) {
            anomaly = 'Admission Admin with Campus (Possible Misclassified Campus Admin)'
        }

        if (anomaly) {
            summary.suspects.push({
                id: admin.adminId,
                name: admin.adminName,
                nav_role: role,
                db_role: admin.role,
                campus: admin.assignedCampus || 'NULL',
                issue: anomaly
            })
        }
    }

    console.log(`Total Admins: ${summary.total}`)
    console.log('\nRole Distribution:')
    Object.entries(summary.byRole).forEach(([r, count]) => {
        console.log(`- ${r}: ${count}`)
    })

    console.log('\nPotential Issues / Anomalies:')
    if (summary.suspects.length === 0) {
        console.log('✅ No obvious data anomalies found.')
    } else {
        summary.suspects.forEach(s => {
            console.log(`❌ [${s.issue}] ID: ${s.id} | Name: ${s.name} | Role: ${s.nav_role} | Campus: ${s.campus}`)
        })
    }

    console.log('\n--------------------------------')
    console.log('Audit Complete.')
}

auditAdmins()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
