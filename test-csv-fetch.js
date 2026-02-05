const fetch = require('node-fetch')

async function debug() {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE73_7gBL5CiOIP4rTE73_7gBL5/pub?gid=0&single=true&output=csv"
    try {
        const res = await fetch(url)
        const text = await res.text()
        console.log('--- Raw CSV Content (First 1000 chars) ---')
        console.log(text.substring(0, 1000))

        console.log('--- Row Analysis ---')
        const lines = text.split('\n')
        lines.slice(0, 5).forEach((line, i) => {
            console.log(`Line ${i}: [${line.replace(/\r/g, '\\r')}]`)
            const cells = line.split(',')
            console.log(`Cells ${i}:`, JSON.stringify(cells))
        })
    } catch (err) {
        console.error('Fetch Error:', err.message)
    }
}

debug()
