
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Verifying Promo Kit Backend Logic ---')

    // 1. Create a Test Asset
    const testAssetName = 'Test Promo Asset ' + Date.now()
    console.log(`Creating asset: ${testAssetName}`)

    const created = await prisma.marketingAsset.create({
        data: {
            name: testAssetName,
            category: 'Branding',
            fileUrl: 'https://example.com/test-asset.png',
            description: 'Automated test asset',
            isActive: true,
            sortOrder: 1
        }
    })
    console.log('Asset created. ID:', created.id)

    // 2. Fetch Assets (Simulate User View)
    console.log('Fetching active assets...')
    const assets = await prisma.marketingAsset.findMany({
        where: { isActive: true }
    })

    const found = assets.find(a => a.id === created.id)
    if (found) {
        console.log('✅ Verification Passed: Created asset found in active list.')
    } else {
        console.error('❌ Verification Failed: Created asset NOT found.')
    }

    // 3. Delete Asset
    console.log('Deleting test asset...')
    await prisma.marketingAsset.delete({
        where: { id: created.id }
    })
    console.log('Asset deleted.')

    // 4. Verify Deletion
    const check = await prisma.marketingAsset.findUnique({
        where: { id: created.id }
    })
    if (!check) {
        console.log('✅ Verification Passed: Asset successfully deleted.')
    } else {
        console.error('❌ Verification Failed: Asset still exists after delete.')
    }

    console.log('--- Promo Kit Verification Complete ---')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
