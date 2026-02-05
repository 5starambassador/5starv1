const { PrismaClient, Prisma } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
    try {
        console.log('--- Testing Raw SQL Query ---')
        const result = await prisma.$queryRaw(Prisma.sql`
            SELECT SUM("studentFee" * ("yearFeeBenefitPercent" / 100.0) * "confirmedReferralCount") as total
            FROM "User"
            WHERE "confirmedReferralCount" > 0
        `)
        console.log('Result:', JSON.stringify(result, null, 2))

        console.log('--- Testing Alternative Table Name ---')
        try {
            const result2 = await prisma.$queryRaw(Prisma.sql`
                SELECT SUM("studentFee" * ("yearFeeBenefitPercent" / 100.0) * "confirmedReferralCount") as total
                FROM user
                WHERE "confirmedReferralCount" > 0
            `)
            console.log('Result (lowercase user):', JSON.stringify(result2, null, 2))
        } catch (e) {
            console.log('Lowercase user failed:', e.message)
        }

    } catch (err) {
        console.error('Core Query Failed:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

debug()
