import prisma from '../src/lib/prisma'

async function main() {
    const campaigns = await prisma.campaign.findMany({
        where: { waTemplateName: { not: null } },
        select: { id: true, name: true, waTemplateName: true, waVariableMapping: true, targetAudience: true }
    })
    for (const c of campaigns) {
        const aud = (c.targetAudience as any)?.type
        const map = JSON.stringify(c.waVariableMapping)
        console.log(`ID=${c.id} | ${aud} | "${c.name}" | MAP=${map}`)
    }
    await prisma.$disconnect()
}
main()
