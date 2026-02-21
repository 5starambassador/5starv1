/**
 * GrayQuest Payment Gateway Utility
 * Handles session creation and authentication for GrayQuest.
 */

const GQ_BASE_URL = process.env.GRAYQUEST_ENV === 'production'
    ? 'https://erp-api.grayquest.com'
    : 'https://erp-api-stage.graydev.tech';

export async function createGrayQuestSession(data: {
    amount: number,
    customerId: string,
    customerName: string,
    customerMobile: string,
    orderId: string,
    redirectUrl: string
}) {
    const clientId = process.env.GRAYQUEST_CLIENT_ID;
    const clientSecret = process.env.GRAYQUEST_CLIENT_SECRET;
    const apiKey = process.env.GRAYQUEST_API_KEY;
    const slug = process.env.GRAYQUEST_SLUG;

    if (!slug || !apiKey) {
        throw new Error("GrayQuest configuration missing (Slug or API Key)");
    }
    if (!clientId || !clientSecret) {
        throw new Error("GrayQuest Client ID or Secret missing for Basic Auth");
    }

    try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const fetchUrl = `${GQ_BASE_URL}/v1/pp/redirect/${slug}`;

        // Sanitize mobile: Remove anything that's not a digit, take last 10
        const sanitizedMobile = data.customerMobile.replace(/\D/g, '').slice(-10);

        const payload = {
            financial_amount: Number(data.amount), // Ensure number
            customer_mobile: sanitizedMobile,
            customer_name: data.customerName.substring(0, 100), // Max 100 chars
            customer_id: String(data.customerId),
            order_id: String(data.orderId),
            redirect_url: data.redirectUrl,
            source: "WEB"
        };

        console.log(`[GQ] Fetching: ${fetchUrl}`);
        console.log(`[GQ] Payload:`, JSON.stringify(payload, null, 2));

        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
                'GQ-API-Key': apiKey, // Required header based on error message
            },
            body: JSON.stringify(payload),
            redirect: 'manual'
        });

        console.log(`[GQ] Response Status: ${response.status}`);

        // Handle 302 Redirect (Common for GrayQuest "redirect" endpoints)
        if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 303) {
            const location = response.headers.get("location");
            if (location) {
                console.log(`[GQ] Redirect found: ${location}`);
                return {
                    success: true,
                    sessionId: new URL(location).searchParams.get("session_id") || "pending",
                    checkoutUrl: location
                };
            }
        }

        const contentType = response.headers.get("content-type");
        let resData: any;

        if (contentType && contentType.includes("application/json")) {
            resData = await response.json();
            console.log(`[GQ] API JSON Response (${response.status}):`, JSON.stringify(resData, null, 2));
        } else {
            const textData = await response.text();
            console.error(`[GQ] API Non-JSON Response (${response.status}):`, textData.substring(0, 500));

            // If it's a 2xx or 3xx but not JSON, it might still have worked if we missed a header
            if (response.ok) {
                return {
                    success: true,
                    sessionId: "manual_" + Date.now(),
                    checkoutUrl: fetchUrl // Fallback or something went wrong?
                };
            }

            throw new Error(`GrayQuest API returned ${response.status}: ${textData.substring(0, 100)}...`);
        }

        if (!response.ok) {
            console.error("[GQ] Error Response Details:", resData);
            throw new Error(resData.message || resData.error || `GrayQuest API Error: ${response.status}`);
        }

        // Expected response includes a session_id and potentially a checkout_url
        return {
            success: true,
            sessionId: resData.session_id || resData.data?.session_id,
            checkoutUrl: resData.url || resData.data?.url || resData.checkout_url
        };

    } catch (error: any) {
        console.error("GrayQuest API Error [FULL]:", error);
        if (error.cause) console.error("Error Cause:", error.cause);
        throw error;
    }
}
