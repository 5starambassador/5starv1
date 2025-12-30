import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const settings = await prisma.systemSettings.findFirst()
    if (!settings) {
        console.log('No settings found')
        return
    }

    const placeholder = '{referralLink}'

    // Function to replace hardcoded link with placeholder
    const updateText = (text: string | null) => {
        if (!text) return text
        // Regex to find https://achariya.in/apply?ref=... up to a space or end of string
        return text.replace(/https:\/\/achariya\.in\/apply\?ref=[^\s–]+/, placeholder)
    }

    const updatedData = {
        staffReferralText: updateText(settings.staffReferralText),
        parentReferralText: updateText(settings.parentReferralText),
        alumniReferralText: updateText(settings.alumniReferralText),
    }

    await prisma.systemSettings.update({
        where: { id: settings.id },
        data: updatedData
    })

    console.log('Settings updated successfully with placeholders')
    console.log('New Parent Text:', updatedData.parentReferralText)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
