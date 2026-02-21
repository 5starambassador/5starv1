import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GrayQuest Webhook Handler
 * Activated when a payment is completed on GrayQuest.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("[GQ WEBHOOK] Received payload:", JSON.stringify(body, null, 2));

        // Note: GrayQuest payload structure may vary based on version.
        // We look for order_id and status in common locations.
        const orderId = body.order_id || body.data?.order_id || body.client_reference_id;
        const status = body.status || body.data?.status || body.payment_status;

        if (!orderId) {
            console.error("[GQ WEBHOOK] No order_id found in payload");
            return NextResponse.json({ error: "No order_id found" }, { status: 400 });
        }

        // Logic for success
        // GrayQuest success statuses: "success", "paid", "captured" (lowercase or uppercase)
        const isSuccess = status && ["success", "paid", "captured", "PAID", "SUCCESS"].includes(status.toString());

        if (isSuccess) {
            console.log(`[GQ WEBHOOK] Processing SUCCESS for order: ${orderId}`);

            // 1. Update Payment Record
            const updatedPayment = await prisma.payment.update({
                where: { orderId: orderId },
                data: {
                    orderStatus: "PAID",
                    paymentStatus: "Success",
                    paidAt: new Date(),
                    gatewayResponse: body,
                    // If transactionId is available in payload
                    transactionId: body.transaction_id || body.payment_id || body.data?.transaction_id || undefined
                }
            });

            // 2. Activate User
            if (updatedPayment.userId) {
                await prisma.user.update({
                    where: { userId: updatedPayment.userId },
                    data: {
                        status: 'Active',
                        paymentStatus: 'Success',
                        // Sync transaction ID to user record for quick reference
                        transactionId: body.transaction_id || body.payment_id || body.data?.transaction_id || undefined
                    }
                });
                console.log(`[GQ WEBHOOK] User ${updatedPayment.userId} activated successfully.`);
            }
        } else {
            console.warn(`[GQ WEBHOOK] Received non-success status: ${status} for order: ${orderId}`);
            // Update payment record with failure if needed
            await prisma.payment.update({
                where: { orderId: orderId },
                data: {
                    paymentStatus: "Failed",
                    gatewayResponse: body
                }
            }).catch(() => { }); // Recursive safety
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("[GQ WEBHOOK] Fatal processing error:", error);
        // We return 500 so GrayQuest might retry if it was a transient DB error
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
