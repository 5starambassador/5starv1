import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import cashfree from "@/lib/cashfree";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
        return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    try {
        const response = await cashfree.PGOrderFetchPayments(orderId);
        const payments = response.data;

        // Usually checking the first payment or the one with SUCCESS status
        const successPayment = payments?.find((p: any) => p.payment_status === "SUCCESS");
        const paymentStatus = successPayment ? "SUCCESS" : "FAILED";

        // Update DB
        const updatedPayment = await prisma.payment.update({
            where: { orderId },
            include: { user: true },
            data: {
                paymentStatus: paymentStatus,
                orderStatus: successPayment ? "PAID" : "ACTIVE",
                // Capture new Finance Fields if success
                ...(successPayment && {
                    transactionId: successPayment.cf_payment_id ? String(successPayment.cf_payment_id) : undefined,
                    paymentMethod: successPayment.payment_group, // e.g. 'upi', 'credit_card'
                    bankReference: successPayment.bank_reference,
                    paidAt: successPayment.payment_completion_time ? new Date(successPayment.payment_completion_time) : new Date(),
                    gatewayResponse: successPayment as any // Store full debug data
                })
            }
        });

        // 2. If success, activate user
        if (successPayment && updatedPayment.userId) {
            await prisma.user.update({
                where: { userId: updatedPayment.userId },
                data: {
                    status: 'Active',
                    paymentStatus: 'Success'
                }
            })
        }

        // Redirect to frontend status page
        return NextResponse.redirect(new URL(`/payment/status?order_id=${orderId}&status=${paymentStatus}`, req.url));

    } catch (error: any) {
        console.error("Payment Verification Error:", error);
        const msg = error.response?.data?.message || error.message;
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
