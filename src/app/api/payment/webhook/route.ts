import { NextResponse } from "next/server";
import cashfree from "@/lib/cashfree";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        // 1. Get the raw body as text for verification
        const rawBody = await req.text();
        const signature = req.headers.get("x-webhook-signature");
        const timestamp = req.headers.get("x-webhook-timestamp");

        if (!signature || !timestamp) {
            return NextResponse.json({ error: "Missing signature/timestamp" }, { status: 400 });
        }

        // 2. Verify Signature using Cashfree SDK
        // Usage: Cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp)
        try {
            cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
        } catch (err) {
            console.error("Webhook Signature Verification Failed", err);
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }

        // 3. Parse Data
        const body = JSON.parse(rawBody);

        // We are interested in "PAYMENT_SUCCESS_WEBHOOK" or similar events
        // Structure usually: { type: "PAYMENT_SUCCESS_WEBHOOK", data: { order: {...}, payment: {...}, customer: {...} } }

        const type = body.type;
        const data = body.data;

        if (type === "PAYMENT_SUCCESS_WEBHOOK") {
            const orderId = data.order.order_id;
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
                await prisma.user.update({
                    where: { userId: updatedPayment.userId },
                    data: {
                        status: 'Active',
                        paymentStatus: 'Success',
                        transactionId: payment.cf_payment_id ? String(payment.cf_payment_id) : undefined
                    }
                });
            }
        } else if (type === "PAYMENT_FAILED_WEBHOOK") {
            const orderId = data.order.order_id;
            console.log(`Processing Webhook: Failure for Order ${orderId}`);

            await prisma.payment.update({
                where: { orderId: orderId },
                data: {
                    paymentStatus: "Failed",
                    orderStatus: "ACTIVE", // Or FAILED, dependent on business logic. Usually order stays Active until paid or expired.
                    gatewayResponse: data.payment
                }
            });
        }

        return NextResponse.json({ status: "OK" });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
