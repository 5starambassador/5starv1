
const { Cashfree, CFEnvironment } = require('cashfree-pg');
const fs = require('fs');
const path = require('path');

// Manually read .env to avoid dotenv dependency issues
const envPath = path.join(__dirname, '..', '.env');
console.log('Reading .env from:', envPath);
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

console.log("------------------------------------------------");
console.log("Configured Environment:", env.CASHFREE_ENV);
console.log("App ID Prefix:", env.CASHFREE_APP_ID ? env.CASHFREE_APP_ID.substring(0, 5) + '...' : 'MISSING');
console.log("Secret Key Prefix:", env.CASHFREE_SECRET_KEY ? env.CASHFREE_SECRET_KEY.substring(0, 10) + '...' : 'MISSING');
console.log("------------------------------------------------");

try {
    const cfEnv = env.CASHFREE_ENV === 'PRODUCTION' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
    const cashfree = new Cashfree(
        cfEnv,
        env.CASHFREE_APP_ID,
        env.CASHFREE_SECRET_KEY
    );

    const orderId = `TEST_SCRIPT_${Date.now()}`;
    const request = {
        order_amount: 1.00,
        order_currency: "INR",
        order_id: orderId,
        customer_details: {
            customer_id: "test_user_debug",
            customer_phone: "9999999999",
            customer_name: "Debug User"
        },
        order_meta: {
            return_url: "https://example.com/return"
        }
    };

    console.log("Attempting to create order...", orderId);

    cashfree.PGCreateOrder(request).then((response) => {
        console.log("SUCCESS! Order Created.");
        console.log("Order Status:", response.data.order_status);
        console.log("Payment Session ID:", response.data.payment_session_id);
    }).catch((error) => {
        console.error("FAILED to create order.");
        const errorData = error.response ? error.response.data : { message: error.message };
        console.error("Response Status:", error.response ? error.response.status : 'N/A');

        fs.writeFileSync('cf_error.json', JSON.stringify(errorData, null, 2));
        console.log("Error details written to cf_error.json");
    });

} catch (e) {
    console.error("Initialization Error:", e.message);
}
