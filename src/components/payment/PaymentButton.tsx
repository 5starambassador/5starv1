'use client'

import { useState } from 'react'
import { load } from '@cashfreepayments/cashfree-js'
import { toast } from 'sonner'

import { simulatePayment } from '@/app/actions'
import { useRouter } from 'next/navigation'

interface PaymentButtonProps {
    amount: number
    onSuccess?: () => void
    customerPhone?: string
    userId?: number // Added for simulation
}

export default function PaymentButton({ amount, onSuccess, userId }: PaymentButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handlePayment = async () => {
        setLoading(true)
        try {
            // 1. Create order
            const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create order')
            }

            // 2. Load Cashfree SDK with intelligent mode detection
            const isProd = process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production' ||
                window.location.hostname.includes('5starambassador.com') ||
                window.location.hostname.includes('achariya.in');

            const mode = isProd ? "production" : "sandbox";
            console.log(`[DEBUG] Initializing Cashfree in ${mode} mode`);

            const cashfree = await load({ mode });

            // 3. Checkout
            if (data.payment_session_id) {
                await cashfree.checkout({
                    paymentSessionId: data.payment_session_id,
                    redirectTarget: "_self"
                });
            } else {
                throw new Error("No payment session ID received");
            }

        } catch (error: any) {
            console.error("Payment SDK Error:", error)
            toast.error(error.message || 'Payment failed to initialize')
            setLoading(false)
        }
    }

    const handleSimulation = async () => {
        if (!userId) return;
        setLoading(true);
        toast.info("Simulating payment...");
        try {
            const res = await simulatePayment(userId);
            if (res.success) {
                toast.success("Payment Simulated! Redirecting...");
                router.push('/dashboard');
            } else {
                toast.error("Simulation failed");
            }
        } catch (e) {
            toast.error("Error simulating");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-3">
            <button
                onClick={handlePayment}
                disabled={loading}
                className={`w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold tracking-[0.05em] text-sm shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 ${loading ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            >
                {loading ? 'Processing...' : `Pay ₹${amount} Now`}
            </button>

            {process.env.NODE_ENV === 'development' && userId && (
                <button
                    onClick={handleSimulation}
                    disabled={loading}
                    className="w-full text-xs text-slate-400 hover:text-amber-500 underline"
                >
                    [DEV ONLY] Simulate Successful Payment
                </button>
            )}
        </div>
    )
}
