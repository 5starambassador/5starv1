import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const programs = await prisma.externalProgram.findMany()
    console.log('External Programs:')
    programs.forEach(p => {
        console.log(`- ID: ${p.id}, Title: "${p.title}", Slug: "${p.slug}", Target: "${p.targetUrl}", Active: ${p.isActive}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
