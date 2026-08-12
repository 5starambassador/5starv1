import prisma from '../lib/prisma'

async function runDiagnostic() {
    console.log('--- Checking User Table Field Sizes ---')

    try {
        const users = await prisma.user.findMany({
            select: {
                userId: true,
                fullName: true,
                profileImage: true,
                bankAccountDetails: true,
                address: true
            }
        })

        console.log(`Total users in DB: ${users.length}`)

        let totalProfileImageSize = 0
        let maxProfileImageSize = 0
        let maxProfileImageUser = ''

        users.forEach(u => {
            const imgLen = u.profileImage ? u.profileImage.length : 0
            totalProfileImageSize += imgLen
            if (imgLen > maxProfileImageSize) {
                maxProfileImageSize = imgLen
                maxProfileImageUser = `${u.fullName} (ID: ${u.userId})`
            }
        })

        console.log(`Average profileImage size: ${(totalProfileImageSize / users.length).toFixed(1)} chars`)
        console.log(`Max profileImage size: ${maxProfileImageSize} chars (User: ${maxProfileImageUser})`)

        // Check if there are other columns that are large
        const largeImagesCount = users.filter(u => u.profileImage && u.profileImage.length > 50000).length
        console.log(`Users with profileImage > 50KB: ${largeImagesCount}`)

    } catch (error: any) {
        console.error('Error checking user fields:', error)
    } finally {
        await prisma.$disconnect()
    }
}

runDiagnostic()
