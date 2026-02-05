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
        const rows = csvText.split(/\r?\n/).map(row => row.split(','))

        console.log('--- Headers ---')
        console.log(JSON.stringify(rows[0]))

        console.log('--- Row 1 ---')
        console.log(JSON.stringify(rows[1]))

    } catch (err) {
        console.error('Error:', err.message)
    }
}

debug()
