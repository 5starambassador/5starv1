import prisma from '../lib/prisma'

async function debugGetCampuses() {
    console.log('🚀 Attempting to fetch campuses...')
    try {
        const campuses = await prisma.campus.findMany({
            include: { gradeFees: true },
            orderBy: { campusName: 'asc' }
        })
        console.log('✅ Success! Found', campuses.length, 'campuses.')
    } catch (error) {
        console.error('❌ DATABASE ERROR:', error)
        if (error instanceof Error) {
            console.error('Message:', error.message)
            console.error('Stack:', error.stack)
        }
    } finally {
        await prisma.$disconnect()
    }
}

debugGetCampuses()
