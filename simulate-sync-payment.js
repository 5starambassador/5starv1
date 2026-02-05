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
        if (csvText.includes('<html')) {
            console.log('ERROR: Received HTML instead of CSV')
            return
        }

        const rows = csvText.split(/\r?\n/).map(row => row.split(','))
        if (rows.length === 0) return

        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))
        console.log('Headers:', JSON.stringify(headers))

        const mobileIndex = headers.findIndex(h => h.includes('contact'))
        const paymentIndex = headers.findIndex(h => h.includes('payment status'))

        const lead33Mobile = "9442266704"
        const row33 = rows.find(row => {
            const rawMobile = row[mobileIndex] || ""
            return rawMobile.replace(/\D/g, '').slice(-10) === lead33Mobile
        })

        if (row33) {
            console.log('--- Row for Lead 33 ---')
            console.log(`Mobile: ${row33[mobileIndex]}`)
            console.log(`Payment Status: [${row33[paymentIndex]}]`)
            console.log(`Full Row: ${JSON.stringify(row33)}`)
        } else {
            console.log('Lead 33 not found in CSV')
        }

    } catch (err) {
        console.error('Sync Error:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

simulateSync()
