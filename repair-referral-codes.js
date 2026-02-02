const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function generateSmartReferralCode(role, prismaInstance) {
    const normalizedRole = role.toUpperCase()
    let rolePrefix = 'M'

    if (normalizedRole.includes('PARENT')) rolePrefix = 'P'
    else if (normalizedRole.includes('STAFF')) rolePrefix = 'S'
    else if (normalizedRole.includes('ALUMNI')) rolePrefix = 'A'
    else if (normalizedRole.includes('OTHERS')) rolePrefix = 'O'

    const yearSuffix = new Date().getFullYear().toString().slice(-2)
    const basePrefix = `ACH${yearSuffix}-${rolePrefix}`

    const lastUser = await prismaInstance.user.findFirst({
        where: {
            referralCode: {
                startsWith: basePrefix
            }
        },
        orderBy: {
            referralCode: 'desc'
        },
        select: {
            referralCode: true
        }
    })

    let nextNumber = 1

    if (lastUser && lastUser.referralCode) {
        const parts = lastUser.referralCode.split(rolePrefix)
        const lastNumStr = parts[parts.length - 1]
        const lastNum = parseInt(lastNumStr, 10)

        if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1
        }
    }

    const sequenceNumber = nextNumber.toString().padStart(5, '0')
    return `${basePrefix}${sequenceNumber}`
}

async function main() {
    const users = await prisma.user.findMany({
        where: { referralCode: null },
        select: { userId: true, role: true, fullName: true }
    })

    console.log(`Found ${users.length} users with missing referral codes.`)

    let count = 0
    for (const user of users) {
        const newCode = await generateSmartReferralCode(user.role, prisma)

        await prisma.user.update({
            where: { userId: user.userId },
            data: { referralCode: newCode }
        })

        count++
        if (count % 50 === 0) {
            console.log(`Processed ${count}/${users.length} users...`)
        }
    }

    console.log(`Successfully repaired ${count} users.`)
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
