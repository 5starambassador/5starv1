const fetch = require('node-fetch')

async function debug() {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE73_7gBL5CiOIP4rTE73_7gBL5/pub?gid=0&single=true&output=csv"
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        const csvText = await response.text()
        const rows = csvText.split('\n').map(row => row.split(','))

        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))
        const mobileIndex = headers.findIndex(h => h.includes('contact'))
        const paymentIndex = headers.findIndex(h => h.includes('payment status'))

        console.log('Headers:', JSON.stringify(headers))
        console.log(`Indices - Mobile: ${mobileIndex}, Payment: ${paymentIndex}`)

        const mobilesToCheck = ["9442266704", "9442255279"]

        rows.slice(1).forEach(row => {
            const rawMobile = row[mobileIndex] || ""
            const mobile = rawMobile.replace(/\D/g, '').slice(-10)
            if (mobilesToCheck.includes(mobile)) {
                console.log(`Match: ${mobile}`)
                console.log(`Raw Row: ${JSON.stringify(row)}`)
                console.log(`Payment Status in CSV: [${row[paymentIndex]}]`)
            }
        })

    } catch (err) {
        console.error('Error:', err.message)
    }
}

debug()
