import prisma from '../src/lib/prisma'

async function main() {
    // Check all campaigns with IDs >= 36 (find the Referral test campaign)
    const campaigns = await prisma.campaign.findMany({
        where: { id: { gte: 36 } },
        select: { id: true, name: true, waTemplateName: true, waVariableMapping: true, targetAudience: true }
    })
    for (const c of campaigns) {
        const aud = (c.targetAudience as any)?.type
        console.log(`ID=${c.id} | ${aud} | "${c.name}" | TEMPLATE=${c.waTemplateName} | MAP=${JSON.stringify(c.waVariableMapping)}`)
    }
    await prisma.$disconnect()
}
main()
