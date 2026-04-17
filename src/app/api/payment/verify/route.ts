import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import cashfree from "@/lib/cashfree";
import { syncUserStats } from "@/app/sync-actions";
import { encryptReferralCode } from "@/lib/crypto";

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
        const paymentStatusFormatted = successPayment ? "Success" : "Failed";

        // Update DB
        // @ts-ignore: Payment property exists but IDE cache/client is stale
        const updatedPayment = await prisma.payment.update({
            where: { orderId },
            include: { user: true },
            data: {
                paymentStatus: paymentStatusFormatted,
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

        // 2. If success, activate user and sync fields
        if (successPayment && updatedPayment.userId) {
            const user = (updatedPayment as any).user;
            let referralCode = user?.referralCode;

            // FIX: If upgraded passive user, generate referral code
            if (!referralCode && user) {
                const { generateSmartReferralCode } = await import('@/lib/referral-service');
                referralCode = await generateSmartReferralCode(user.role);
                console.log(`[PAYMENT_VERIFY] Generating referral code for upgraded user ${user.userId}: ${referralCode}`);
            }

            await prisma.user.update({
                where: { userId: updatedPayment.userId },
                data: {
                    status: 'Active',
                    paymentStatus: 'Success',
                    referralCode, // Ensure it's set
                    transactionId: successPayment.cf_payment_id ? String(successPayment.cf_payment_id) : undefined,
                    paymentAmount: successPayment.payment_amount || undefined
                }
            })

            // CRITICAL: Perform a deep-sync to ensure benefits/slabs/student-records are all in line
            // ⚡ INTEGRATION: Trigger Welcome Automations & Messages
            // We send the Welcome Message if status IS NOT Active (First time) OR if it was already active (upgrade/retry)
            if (user?.mobileNumber) {
                const { whatsappService } = await import('@/lib/whatsapp-service');
                const encryptedCode = encryptReferralCode(referralCode || '');
                const marketingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5starambassador.com'}/r/${encryptedCode}`
                
                await whatsappService.sendByEvent(
                    user.mobileNumber, 
                    'WELCOME_MESSAGE', 
                    [referralCode || 'PENDING', marketingUrl], 
                    'ALERT',
                    undefined,
                    undefined,
                    [],
                    user.role || 'User',
                    user.assignedCampus || '-'
                ).catch(err => console.error('Failed to send welcome whatsapp:', err))
            }

            // ⚡ Trigger Instant Automations (Smart Rules Engine) ONLY for first-time activation
            if (user?.status !== 'Active') {
                try {
                    const { automationEngine } = await import('@/lib/automation-engine')
                    await automationEngine.processImmediateEvent('ON_PAYMENT_SUCCESS', updatedPayment.userId, { 
                        amount: successPayment.payment_amount || undefined 
                    })
                } catch (err) {
                    console.error('[AutomationEngine] Trigger failed:', err)
                }
            }

        }


        // Redirect directly to dashboard on success, or back to payment on failure
        if (paymentStatusFormatted === 'Success') {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        } else {
            return NextResponse.redirect(new URL(`/complete-payment?status=${paymentStatusFormatted}`, req.url));
        }

    } catch (error: any) {
        console.error("Payment Verification Error:", error);
        const msg = error.response?.data?.message || error.message;
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
