import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_LEAD_IDS = [
    593, 586, 585, 577, 567, 560, 559, 542, 541, 540, 537, 530, 527, 526, 524, 523, 504, 499, 498, 488, 484, 477, 474, 469, 463, 459,
    458, 455, 454, 452, 449, 443, 437, 432, 431, 429, 423, 422, 420, 419, 414, 413, 409, 405, 404, 401, 386, 379, 377, 364, 358, 357,
    349, 340, 338, 335, 333, 324, 321, 320, 317, 312, 300, 299, 295, 290, 286
]

async function revert() {
    console.log(`Starting targeted reversion for ${TARGET_LEAD_IDS.length} leads...`)

    // 1. Revert Lead academic years
    const leadUpdate = await prisma.referralLead.updateMany({
        where: { leadId: { in: TARGET_LEAD_IDS } },
        data: { admittedYear: '2025-2026' }
    })
    console.log(`Updated ${leadUpdate.count} leads to 2025-2026.`)

    // 2. Identify and Revert Ambassadors (Users)
    const leads = await prisma.referralLead.findMany({
        where: { leadId: { in: TARGET_LEAD_IDS } },
        select: { userId: true }
    })

    const uniqueUserIds = [...new Set(leads.map(l => l.userId))]

    const userUpdate = await prisma.user.updateMany({
        where: {
            userId: { in: uniqueUserIds },
            academicYear: '2026-2027' // Only revert if they are in the wrong year
        },
        data: { academicYear: '2025-2026' }
    })
    console.log(`Updated ${userUpdate.count} ambassadors to 2025-2026.`)

    console.log('Reversion complete.')
}

revert()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
