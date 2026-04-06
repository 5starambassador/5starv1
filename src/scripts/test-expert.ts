import 'dotenv/config'
import { whatsappService } from '../lib/whatsapp-service'

async function runFinalTest() {
    console.log("🚀 STARTING FINAL EXPERT TEST (MATCHED TO DISK KEY & AUTO-NAMESPACE)...")
    
    const mobile = "9442266704"
    const templateName = "referral_followup_2"
    const variables = ["Raji (Mirror Test)", "ABSM - THENGAITHITTU"]
    const headerUrl = "https://5starambassador.com/assets/marketing/Referral%20followup02.jpeg"
    const buttonVariables: string[] = []

    try {
        const activeAuthKey = "485538ATG9yVd1C69a4475aP1" // Proven to succeed at 9:58 PM
        const url = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/"
        
        const payload: any = {
            integrated_number: "919944600905",
            content_type: "template",
            payload: {
                messaging_product: "whatsapp",
                type: "template",
                to: mobile,
                template: {
                    name: templateName,
                    namespace: "a4fe4058_eaa9_45d8_91d6_df10d082de80",
                    language: {
                        policy: "deterministic",
                        code: "en"
                    },
                    components: await (whatsappService as any).prepareComponents(templateName, variables, headerUrl, buttonVariables)
                }
            }
        }

        console.log("\n🚀 SENDING RAW PAYLOAD TO INDIVIDUAL API (MIRRORING 21:58):")
        console.log(JSON.stringify(payload, null, 2))

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authkey': activeAuthKey
            },
            body: JSON.stringify(payload)
        })

        console.log(`[HTTP_DEBUG] Status: ${response.status} ${response.statusText}`)
        const rawBody = await response.text()
        console.log(`[HTTP_DEBUG] Body: ${rawBody}`)

        let res: any
        try {
            res = JSON.parse(rawBody)
        } catch (e) {
            res = { success: false, error: "Non-JSON Response", raw: rawBody }
        }

        console.log("\n--- TEST RESULT ---")
        console.log(JSON.stringify(res, null, 2))
        console.log("-------------------\n")

        if (res.success) {
            console.log("✅ MSG91 ACCEPTED! Check your WhatsApp and Dashboard.")
        } else {
            console.log("❌ REJECTED:", res.error)
        }
    } catch (err: any) {
        console.error("💥 CRASHED:", err.message)
    }
}

runFinalTest()
