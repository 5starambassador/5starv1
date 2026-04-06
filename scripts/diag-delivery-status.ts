import 'dotenv/config';

async function checkStatus() {
    const messageId = "31677a33f44535353139373732"; // The last campaign message ID
    const authKey = process.env.MSG91_AUTH_KEY || "";
    
    console.log(`🔍 Diagnosing Delivery Status for Message: ${messageId}...`);
    
    // Probing MSG91 Status API
    const res = await fetch(`https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/${messageId}/status`, {
        headers: {
            'authkey': authKey
        }
    });

    const data = await res.json();
    console.log("Detailed Status API Response:", JSON.stringify(data, null, 2));
    
    if (data.status === 'success') {
        console.log("-----------------------------------------");
        console.log("🎯 OFFICIAL STATUS:", data.data?.status || "Unknown");
        console.log("🎯 ERROR REASON:", data.data?.error || "None");
        console.log("-----------------------------------------");
    }
}

checkStatus().catch(console.error);
