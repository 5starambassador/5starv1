import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Database Status Check ---')
    try {
        const userCount = await prisma.user.count()
        const adminCount = await prisma.admin.count()
        const settingsCount = await prisma.systemSettings.count()
        const campusCount = await prisma.campus.count()
        const leadCount = await prisma.referralLead.count()

        console.log(`Users: ${userCount}`)
        console.log(`Admins: ${adminCount}`)
        console.log(`System Settings: ${settingsCount}`)
        console.log(`Campuses: ${campusCount}`)
        console.log(`Leads: ${leadCount}`)

        if (settingsCount === 0) {
            console.log('WARNING: SystemSettings table is EMPTY. Registration will be DISABLED by default.')
        } else {
            const settings = await prisma.systemSettings.findFirst()
            console.log(`Allow New Registrations: ${settings?.allowNewRegistrations}`)
        }

    } catch (error) {
        console.error('Error checking database:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
