import * as dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testGoogleSheets() {
    const url = process.env.GOOGLE_SHEETS_AUDIT_URL
    console.log('🔍 Testing URL:', url)

    if (!url) {
        console.error('❌ GOOGLE_SHEETS_AUDIT_URL not found in .env.local')
        return
    }

    const payload = {
        action: 'DEBUG_TEST',
        module: 'TEST',
        description: 'Testing the connection from local environment. Request ID: ' + Math.random().toString(36).substring(7),
        actorName: 'Debug Bot',
        ip: '127.0.0.1',
        requestId: 'DEBUG-' + Date.now()
    }

    try {
        console.log('⬆️ Sending payload...')
        const response = await fetch(url, {
            method: 'POST',
            // Note: mode: 'no-cors' is for browsers. In Node/Next server, we just send the request.
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        })

        console.log('✅ Response Status:', response.status)
        const text = await response.text()
        console.log('📄 Response Body:', text)

        if (text.includes('Success') || response.status === 200) {
            console.log('🌟 EXCELLENT! The connection works.')
        } else {
            console.warn('⚠️ Received suspicious response. Check your Apps Script logs.')
        }
    } catch (err) {
        console.error('❌ Connection Failed:', err)
    }
}

testGoogleSheets()
