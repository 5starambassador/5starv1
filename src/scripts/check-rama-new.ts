import prisma from '../lib/prisma'

async function checkRamaByPhone() {
    console.log('--- Auditing G. RAMA (9790900990) for NEW badge ---')
    const user = await prisma.user.findFirst({
        where: { mobileNumber: '9790900990' }
    })

    if (!user) {
        console.log('User with phone 9790900990 not found.')
        return
    }

    console.log(`Found User: ${user.fullName} (ID: ${user.userId})`)

    const leads = await prisma.referralLead.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' }
    })

    if (leads.length === 0) {
        console.log('  No referrals found.')
    } else {
        console.log(`  Found ${leads.length} referrals.`)
        for (const lead of leads) {
            const time = new Date(lead.createdAt).getTime()
            const diffHours = (Date.now() - time) / (1000 * 60 * 60)
            console.log(`  Lead: ${lead.studentName} | Year: ${lead.academicYear} | Created: ${lead.createdAt.toISOString()} | Age: ${diffHours.toFixed(1)} hours`)
        }
    }
}

checkRamaByPhone().catch(console.error)
