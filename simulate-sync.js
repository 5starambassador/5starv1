const fetch = require('node-fetch')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function simulateSync() {
    const programId = 2
    const program = await prisma.externalProgram.findUnique({ where: { id: programId } })

    if (!program || !program.autoSyncUrl) {
        console.log('Program or URL missing')
        return
    }

    console.log(`Fetching from: ${program.autoSyncUrl}`)

    try {
        const response = await fetch(program.autoSyncUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        const csvText = await response.text()
        console.log('Response length:', csvText.length)
        if (csvText.includes('<html')) {
            console.log('ERROR: Received HTML instead of CSV')
            console.log('Preview:', csvText.substring(0, 200))
            return
        }

        const rows = csvText.split('\n').map(row => row.split(','))
        console.log('Total rows:', rows.length)

        if (rows.length === 0) return

        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))
        console.log('Headers:', JSON.stringify(headers))

        const mobileIndex = headers.findIndex(h =>
            h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('number')
        )
        const nameIndex = headers.findIndex(h =>
            h.includes('student name') || h.includes('name of the student') || (h.includes('name') && !h.includes('parent'))
        )

        console.log(`Indices - Mobile: ${mobileIndex}, Name: ${nameIndex}`)

        const leadsToUpdate = rows.slice(1).map(row => {
            const rawMobile = row[mobileIndex]
            if (!rawMobile) return null
            const mobile = rawMobile.replace(/\D/g, '').slice(-10)
            let studentName = null
            if (nameIndex !== -1 && row[nameIndex]) {
                studentName = row[nameIndex].trim().replace(/^"|"$/g, '')
            }
            return { mobile, studentName }
        }).filter(l => l !== null)

        console.log('Processed lead data count:', leadsToUpdate.length)

        const lead33Mobile = "9442266704"
        const match = leadsToUpdate.find(l => l.mobile === lead33Mobile)

        if (match) {
            console.log('MATCH FOUND for Lead 33 Mobile!')
            console.log('Lead Data:', JSON.stringify(match))

            const dbLead = await prisma.programLead.findFirst({
                where: {
                    programId: programId,
                    status: 'CLICKED',
                    visitorMobile: { contains: lead33Mobile }
                }
            })

            if (dbLead) {
                console.log('Found CLICKED lead in DB for this mobile!')
                console.log('DB Lead ID:', dbLead.id)
            } else {
                console.log('No CLICKED lead found in DB for this mobile. checking other status...')
                const otherStatus = await prisma.programLead.findMany({
                    where: { programId, visitorMobile: { contains: lead33Mobile } }
                })
                console.log('Other leads for this mobile:', JSON.stringify(otherStatus, null, 2))
            }
        } else {
            console.log('No match found in CSV for mobile:', lead33Mobile)
            console.log('Sample mobile from CSV:', leadsToUpdate[0]?.mobile)
        }

    } catch (err) {
        console.error('Sync Error:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

simulateSync()
