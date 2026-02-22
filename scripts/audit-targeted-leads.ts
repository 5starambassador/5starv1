import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_IDS = [
    593, 586, 585, 577, 567, 560, 559, 542, 541, 540, 537, 530, 527, 526, 524, 523, 504, 499, 498, 488, 484, 477, 474, 469, 463, 459,
    458, 455, 454, 452, 449, 443, 437, 432, 431, 429, 423, 422, 420, 419, 414, 413, 409, 405, 404, 401, 386, 379, 377, 364, 358, 357,
    349, 340, 338, 335, 333, 324, 321, 320, 317, 312, 300, 299, 295, 290, 286
]

async function audit() {
    console.log(`Auditing ${TARGET_IDS.length} Lead IDs identified from screenshots...`)

    const leads = await prisma.referralLead.findMany({
        where: { leadId: { in: TARGET_IDS } },
        select: {
            leadId: true,
            admittedYear: true,
            userId: true,
            user: {
                select: {
                    fullName: true,
                    referralCode: true,
                    academicYear: true
                }
            }
        }
    })

    console.log(`Found ${leads.length} of ${TARGET_IDS.length} leads.`)

    // Group by current status
    const stats = {
        leadsIn26: leads.filter(l => l.admittedYear === '2026-2027').length,
        leadsIn25: leads.filter(l => l.admittedYear === '2025-2026').length,
        usersIn26: leads.filter(l => l.user?.academicYear === '2026-2027').length,
        usersIn25: leads.filter(l => l.user?.academicYear === '2025-2026').length,
    }

    console.log('Current Status Statistics:', stats)

    if (leads.length > 0) {
        console.log('\nSample mapping (First 5):')
        leads.slice(0, 5).forEach(l => {
            console.log(`Lead ${l.leadId}: AdmittedYear [${l.admittedYear}] | Ambassador ${l.user?.fullName} (${l.user?.referralCode}): Registered [${l.user?.academicYear}]`)
        })
    }
}

audit()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
