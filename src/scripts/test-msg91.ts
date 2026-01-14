const MSG91_CONFIG = {
    authKey: "485538AfzLQYaH69672145P1",
    senderId: "ACHAPP",
    templates: {
        registration: "69671ce2f0f84f0363446ec4",
        "forgot-password": "69671d580b181d4b4d18d092",
        referral: "69671da09556fa4ffa1aaf28"
    }
}

async function testMsg91() {
    const mobile = process.argv[2]
    const flow = process.argv[3] || 'registration'

    if (!mobile || mobile.length < 10) {
        console.error('Usage: npx tsx src/scripts/test-msg91.ts <mobile> [registration|forgot-password|referral]')
        process.exit(1)
    }

    const otp = '123456'
    // @ts-ignore
    const templateId = MSG91_CONFIG.templates[flow]

    if (!templateId) {
        console.error(`Invalid flow: ${flow}. Available: registration, forgot-password, referral`)
        process.exit(1)
    }

    console.log(`\n--- MSG91 Connectivity Test ---`)
    console.log(`Target: ${mobile}`)
    console.log(`Flow: ${flow}`)
    console.log(`Template: ${templateId}`)

    const url = "https://control.msg91.com/api/v5/otp?" + new URLSearchParams({
        template_id: templateId,
        mobile: '91' + mobile,
        authkey: MSG91_CONFIG.authKey,
        otp: otp
    })

    console.log(`\n[DEBUG] URL: ${url}`)

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        const data = await response.json()
        console.log(`\n[RESPONSE] Status: ${response.status}`)
        console.log(`[RESPONSE] Body:`, JSON.stringify(data, null, 2))
    } catch (e: any) {
        console.error('\n[FATAL ERROR]', e.message)
    }
}

testMsg91()
