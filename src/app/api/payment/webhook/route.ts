import { NextResponse } from "next/server";
import cashfree from "@/lib/cashfree";
import prisma from "@/lib/prisma";
import { syncUserStats } from "@/app/sync-actions";

export async function POST(req: Request) {
    let orderId = "unknown";
    try {
        // 1. Get the raw body as text for verification
        const rawBody = await req.text();
        const signature = req.headers.get("x-webhook-signature");
        const timestamp = req.headers.get("x-webhook-timestamp");

        // Parse Data early to get Order ID if possible for logging
        let body: any = {};
        try {
            body = JSON.parse(rawBody);
            orderId = body?.data?.order?.order_id || "unknown";
        } catch (e) {
            console.error("[WEBHOOK] Body Parse Failed");
        }

        console.log("[WEBHOOK] Received Request:", {
            orderId,
            hasSignature: !!signature,
            hasTimestamp: !!timestamp,
            bodyLength: rawBody.length
        });

        if (!signature || !timestamp) {
            console.error("[WEBHOOK] Missing Headers:", { signature, timestamp });

            // Resilience: If this is a simple dashboard test, just return 200
            if (rawBody.includes('"test"') || rawBody.length === 0) {
                return NextResponse.json({ status: "TEST_PING_OK" });
            }

            await prisma.activityLog.create({
                data: {
                    action: 'ERROR',
                    module: 'WEBHOOK',
                    targetId: orderId,
                    description: `Missing signature or timestamp for order ${orderId}`
                }
            }).catch(() => { });

            return NextResponse.json({ error: "Missing signature/timestamp" }, { status: 400 });
        }

        // 2. Verify Signature using Cashfree SDK
        try {
            cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
        } catch (err: any) {
            console.error("[WEBHOOK] Signature Verification Failed:", err.message);

            await prisma.activityLog.create({
                data: {
                    action: 'ERROR',
                    module: 'WEBHOOK',
                    targetId: orderId,
                    description: `Signature verification failed for order ${orderId}: ${err.message}`,
                    metadata: { signature, timestamp }
                }
            }).catch(() => { });

            // If verification fails, return 403.
            return NextResponse.json({ error: "Invalid signature", detail: err.message }, { status: 403 });
        }

        const type = body.type;
        const data = body.data;

        if (type === "PAYMENT_SUCCESS_WEBHOOK") {
            const payment = data.payment;

            // 4. Update Database
            console.log(`Processing Webhook: Success for Order ${orderId}`);

            const updatedPayment = await prisma.payment.update({
                where: { orderId: orderId },
                data: {
                    paymentStatus: "Success",
                    orderStatus: "PAID",
                    transactionId: payment.cf_payment_id ? String(payment.cf_payment_id) : undefined,
                    paymentMethod: payment.payment_group,
                    bankReference: payment.bank_reference,
                    paidAt: payment.payment_completion_time ? new Date(payment.payment_completion_time) : new Date(),
                    gatewayResponse: payment // Store full webhook payment data
                }
            });

            // 5. Activate User
            if (updatedPayment.userId) {
                const user = await prisma.user.findUnique({
                    where: { userId: updatedPayment.userId },
                    select: { role: true, referralCode: true }
                });

                let referralCode = user?.referralCode;
                if (!referralCode && user) {
                    const { generateSmartReferralCode } = await import('@/lib/referral-service');
                    referralCode = await generateSmartReferralCode(user.role);
                    console.log(`[WEBHOOK] Generating referral code for upgraded user ${updatedPayment.userId}: ${referralCode}`);
                }

                await prisma.user.update({
                    where: { userId: updatedPayment.userId },
                    data: {
                        status: 'Active',
                        paymentStatus: 'Success',
                        referralCode, // Ensure it's set
                        transactionId: payment.cf_payment_id ? String(payment.cf_payment_id) : undefined
                    }
                });

                // Centralized Sync: Creates Student record and confirms referrals
                await syncUserStats(updatedPayment.userId)
            }


            await prisma.activityLog.create({
                data: {
                    action: 'SUCCESS',
                    module: 'WEBHOOK',
                    targetId: orderId,
                    description: `Successfully processed payment webhook for order ${orderId}`
                }
            }).catch(() => { });

        } else if (type === "PAYMENT_FAILED_WEBHOOK") {
            console.log(`Processing Webhook: Failure for Order ${orderId}`);

            await prisma.payment.update({
                where: { orderId: orderId },
                data: {
                    paymentStatus: "Failed",
                    orderStatus: "ACTIVE", // Or FAILED, dependent on business logic.
                    gatewayResponse: data.payment
                }
            });

            await prisma.activityLog.create({
                data: {
                    action: 'FAILURE',
                    module: 'WEBHOOK',
                    targetId: orderId,
                    description: `Processed failure webhook for order ${orderId}`,
                    metadata: data.payment
                }
            }).catch(() => { });
        } else {
            // Log other event types
            await prisma.activityLog.create({
                data: {
                    action: 'INFO',
                    module: 'WEBHOOK',
                    targetId: orderId,
                    description: `Received webhook event: ${type} for order ${orderId}`,
                    metadata: body
                }
            }).catch(() => { });
        }

        return NextResponse.json({ status: "OK" });

    } catch (error: any) {
        console.error("Webhook Error:", error);

        await prisma.activityLog.create({
            data: {
                action: 'ERROR',
                module: 'WEBHOOK',
                targetId: orderId,
                description: `Internal error processing webhook for ${orderId}: ${error.message}`
            }
        }).catch(() => { });

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
