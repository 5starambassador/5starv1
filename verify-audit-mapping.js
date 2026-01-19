const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testMapping(label, moduleTags) {
    console.log(`Testing [${label}] with tags: ${JSON.stringify(moduleTags)}`)
    const count = await prisma.activityLog.count({
        where: { module: { in: moduleTags } }
    })
    console.log(`- Result: ${count} logs found`)
}

async function main() {
    console.log('--- Verifying Backend Mapping Logic ---')

    // ADMIN mappings
    await testMapping('ADMIN', ['user', 'admin', 'system', 'ADMIN', 'USER'])

    // AUTH mappings
    await testMapping('AUTH', ['auth', 'AUTH', 'login', 'SECURITY'])

    // LEADS mappings
    await testMapping('LEADS', ['referral', 'lead-mgmt', 'leads', 'LEADS', 'REFERRAL'])

    // FINANCE mappings
    await testMapping('FINANCE', ['finance', 'settlement', 'payout', 'FINANCE', 'SETTLEMENT'])
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
