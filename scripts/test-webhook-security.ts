import { fetch } from 'undici'

async function testSecurity() {
    const baseUrl = 'http://localhost:3000'
    
    console.log('--- Testing MSG91 Webhook Security ---')
    const msg91Res = await fetch(`${baseUrl}/api/webhooks/msg91`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ mobile: '919876543210', status: 'delivered', CRQID: '123' }])
    })
    console.log(`Unauthenticated MSG91 Response: ${msg91Res.status} (Expected: 401 if secret set)`)

    console.log('\n--- Testing WhatsApp Chatbot Security ---')
    const waRes = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '919876543210', text: 'HELLO' })
    })
    console.log(`Unauthenticated WhatsApp Response: ${waRes.status} (Expected: 401 if secret set)`)
}

testSecurity().catch(console.error)
