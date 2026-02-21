
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Checking Campaigns...')
    const campaigns = await prisma.campaign.findMany()
    console.log(`Found ${campaigns.length} campaigns:`)
    campaigns.forEach(c => console.log(`- [${c.id}] ${c.name} (${c.status})`))

    console.log('\nChecking Users...')
    const users = await prisma.user.findMany({
        where: { role: { notIn: ['Parent', 'Staff', 'Alumni', 'Others'] } }
    })
    console.log(`Found ${users.length} admin/privileged users`)

    console.log('\nChecking Admins table...')
    const admins = await prisma.admin.findMany()
    console.log(`Found ${admins.length} admins in Admin table`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
