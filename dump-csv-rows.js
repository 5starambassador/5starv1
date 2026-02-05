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
        if (csvText.includes('<html')) {
            console.log('HTML detected. Redirection likely.')
            return
        }

        const rows = csvText.split(/\r?\n/).map(row => row.split(','))
        const mobilesToCheck = ["9442266704", "9442255279"]

        console.log('Searching for mobiles...')
        rows.forEach((row, i) => {
            const raw = row.join(',')
            mobilesToCheck.forEach(m => {
                if (raw.includes(m)) {
                    console.log(`Match at row ${i}:`)
                    console.log(JSON.stringify(row, null, 2))
                }
            })
        })

    } catch (err) {
        console.error('Error:', err.message)
    }
}

debug()
