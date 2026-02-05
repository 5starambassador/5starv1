const fetch = require('node-fetch')

async function dump() {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE73_7gBL5CiOIP4rTE73_7gBL5/pub?gid=0&single=true&output=csv"
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        const csvText = await response.text()
        const rows = csvText.split(/\r?\n/).map(row => row.split(','))

        console.log('--- FULL CSV DUMP ---')
        rows.forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row))
        })

    } catch (err) {
        console.error('Error:', err.message)
    }
}

dump()
