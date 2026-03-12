const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkJobs() {
    const pendingJobs = await prisma.job.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${pendingJobs.length} PENDING jobs:`)
    pendingJobs.forEach(j => {
        console.log(`- ID: ${j.id} | Type: ${j.type} | Payload: ${JSON.stringify(j.payload)}`)
    })

    const processingJobs = await prisma.job.findMany({
        where: { status: 'PROCESSING' }
    })
    console.log(`\nFound ${processingJobs.length} PROCESSING jobs:`)
    
    await prisma.$disconnect()
}

checkJobs()
