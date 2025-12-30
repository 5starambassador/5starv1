import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const settings = await prisma.systemSettings.findFirst()
    if (!settings) {
        console.log('No settings found')
        return
    }

    const newText = `Hello 👋 I'm part of Achariya's 5-Star Ambassador Program. I recommend you to explore admission for your child. Click here: {referralLink}`

    await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
            staffReferralText: newText,
            parentReferralText: newText,
            alumniReferralText: newText,
        }
    })

    console.log('Settings force-updated successfully')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
