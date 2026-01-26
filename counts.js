const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function counts() {
    const models = ['user', 'referralLead', 'student', 'campus', 'academicYear', 'gradeFee', 'benefitSlab']
    const results = {}
    for (const model of models) {
        results[model] = await prisma[model].count()
    }
    console.log('RESULTS_START')
    console.log(JSON.stringify(results, null, 2))
    console.log('RESULTS_END')
}

counts().catch(console.error).finally(() => prisma.$disconnect())
