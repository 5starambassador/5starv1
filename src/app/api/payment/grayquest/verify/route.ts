import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
        return NextResponse.redirect(new URL('/?status=Error', req.url));
    }

    try {
        // 1. Fetch the payment record from DB
        const payment = await prisma.payment.findUnique({
            where: { orderId },
            include: { user: true }
        });

        if (!payment) {
            return NextResponse.redirect(new URL('/?status=NotFound', req.url));
        }

        // 2. Ideally, we should fetch status from GrayQuest here to be 100% sure
        // But since we are building a robust system, we assume the webhook might have fired or will fire soon.
        // For immediate feedback, we can check if it's already marked as PAID.

        if (payment.orderStatus === 'PAID' || payment.paymentStatus === 'Success') {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }

        // If not yet confirmed by webhook, we can either:
        // A. Poll GrayQuest API (if we knew the exact status endpoint)
        // B. Show a "Processing" page
        // C. Redirect to dashboard and let the Hard Block handle it if still pending.

        // For simplicity and to satisfy the user's "Hard Block" requirement:
        // If they are redirected back, they might have completed payment.
        // We'll redirect to dashboard. If status is still Pending, the middleware will kick them back to /?step=payment.
        return NextResponse.redirect(new URL('/dashboard', req.url));

    } catch (error: any) {
        console.error("GrayQuest Verification Error:", error);
        return NextResponse.redirect(new URL('/?status=Error', req.url));
    }
}
