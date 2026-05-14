import prisma from '../src/lib/prisma'

async function testBackup() {
    console.log('Starting backup test...')
    try {
        const timestamp = new Date().toISOString()
        
        console.log('Fetching data...')
        const [
            users,
            students,
            leads,
            admins,
            campuses,
            gradeFees,
            settings
        ] = await Promise.all([
            prisma.user.findMany().then(d => { console.log('Users fetched:', d.length); return d; }),
            prisma.student.findMany().then(d => { console.log('Students fetched:', d.length); return d; }),
            prisma.referralLead.findMany().then(d => { console.log('Leads fetched:', d.length); return d; }),
            prisma.admin.findMany().then(d => { console.log('Admins fetched:', d.length); return d; }),
            prisma.campus.findMany().then(d => { console.log('Campuses fetched:', d.length); return d; }),
            prisma.gradeFee.findMany().then(d => { console.log('GradeFees fetched:', d.length); return d; }),
            prisma.systemSettings.findFirst().then(d => { console.log('Settings fetched'); return d; })
        ])

        console.log('Constructing backup object...')
        const backupData = {
            metadata: {
                version: '1.0',
                timestamp,
                exportedBy: 'TEST'
            },
            data: {
                users,
                students,
                leads,
                admins,
                campuses,
                feeStructures: gradeFees,
                settings
            }
        }

        console.log('Stringifying to check size...')
        const json = JSON.stringify(backupData)
        console.log('Backup size:', (json.length / 1024 / 1024).toFixed(2), 'MB')
        
        console.log('Backup successful!')
    } catch (error: any) {
        console.error('Backup FAILED with error:', error)
        if (error.message) console.error('Message:', error.message)
        if (error.stack) console.error('Stack:', error.stack)
    } finally {
        await prisma.$disconnect()
    }
}

testBackup()
