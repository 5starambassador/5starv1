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

            // 2. Load Cashfree SDK
            // Auto-detect production mode if NEXT_PUBLIC_CASHFREE_MODE is not set
            const isProdEnv = process.env.NODE_ENV === 'production' ||
                (typeof window !== 'undefined' && window.location.hostname.includes('5starambassador.com'));

            const cashfree = await load({
                mode: (process.env.NEXT_PUBLIC_CASHFREE_MODE as "sandbox" | "production") || (isProdEnv ? "production" : "sandbox")
            });

            // 3. Checkout
            await cashfree.checkout({
                paymentSessionId: data.payment_session_id,
                redirectTarget: "_self" // or "_blank", or container
            });

            // Cashfree redirect takes over, so we might not reach here unless logic is popup
            // If redirect, the user comes back to return_url (verify API)

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Payment failed')
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
