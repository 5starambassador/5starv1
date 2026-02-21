import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { createGrayQuestSession } from "@/lib/grayquest";

export async function GET() {
    return NextResponse.json({ status: "API is reachable", timestamp: new Date().toISOString() });
}

export async function POST(req: Request) {
    console.log("[GQ] Incoming session request");

    try {
        const session = await getSession();
        console.log("[GQ] User session ID:", session?.userId);

        if (!session || !session.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        const { amount } = body;

        const user = await prisma.user.findUnique({
            where: { userId: session.userId as number },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const orderId = `GQ_${Date.now()}_${user.userId}`;
        const customerPhone = user.mobileNumber || "9999999999";
        const customerName = user.fullName || "User";

        // Determine base URL for redirect. Use localhost if ngrok not set/working for local tests
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
        const redirectUrl = `${baseUrl}/api/payment/grayquest/verify?order_id=${orderId}`;

        console.log(`[GQ] Creating session for order ${orderId} with redirect ${redirectUrl}`);

        // 1. Create session in GrayQuest
        let gqResponse;
        try {
            gqResponse = await createGrayQuestSession({
                amount,
                customerId: user.userId.toString(),
                customerName,
                customerMobile: customerPhone,
                orderId,
                redirectUrl: redirectUrl
            });
        } catch (gqError: any) {
            console.error("[GQ] GrayQuest API call failed:", gqError.message);
            return NextResponse.json({
                error: "GrayQuest service unavailable",
                details: gqError.message,
                step: "service_call"
            }, { status: 502 });
        }

        console.log("[GQ] Session created successfully!");

        // 2. Save to DB
        // @ts-ignore
        await prisma.payment.create({
            data: {
                orderId: orderId,
                paymentSessionId: gqResponse.sessionId,
                orderAmount: amount,
                userId: user.userId,
                orderStatus: "PENDING",
                paymentMethod: "GRAYQUEST"
            }
        });

        return NextResponse.json({
            success: true,
            checkoutUrl: gqResponse.checkoutUrl,
            sessionId: gqResponse.sessionId,
            orderId: orderId
        });

    } catch (error: any) {
        console.error("[GQ] Fatal route error:", error);
        return NextResponse.json({
            error: "Internal server error during payment initiation",
            details: error.message
        }, { status: 500 });
    }
}
