const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
    try {
        const userCount = await prisma.user.count()
        const leadCount = await prisma.referralLead.count()
        const programLeadCount = await prisma.programLead.count()
        const adminCount = await prisma.admin.count()

        console.log(`--- DB COUNTS ---`)
        console.log(`Users: ${userCount}`)
        console.log(`ReferralLeads: ${leadCount}`)
        console.log(`ProgramLeads: ${programLeadCount}`)
        console.log(`Admins: ${adminCount}`)

        const superAdminPerms = await prisma.rolePermissions.findUnique({
            where: { role: 'Super Admin' }
        })

        console.log(`--- PERMISSIONS (Super Admin) ---`)
        if (superAdminPerms) {
            console.log(JSON.stringify(superAdminPerms, null, 2))
        } else {
            console.log('No DB record for Super Admin permissions.')
        }

    } catch (err) {
        console.error('DB Error:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

debug()
