'use client'

import { useState } from 'react'
import { load } from '@cashfreepayments/cashfree-js'
import { toast } from 'sonner'

import { simulatePayment } from '@/app/actions'
import { getSystemSettings } from '@/app/settings-actions'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface PaymentButtonProps {
    amount: number
    onSuccess?: () => void
    customerPhone?: string
    userId?: number
}

import ManualPaymentModal from './ManualPaymentModal'
import { useSearchParams } from 'next/navigation'

export default function PaymentButton({ amount, onSuccess, userId }: PaymentButtonProps) {
    const [loading, setLoading] = useState(false)
    const [showManual, setShowManual] = useState(false)
    const [showFallback, setShowFallback] = useState(false)
    const [allowManual, setAllowManual] = useState(true)
    const [activeGateway, setActiveGateway] = useState('CASHFREE')

    useEffect(() => {
        getSystemSettings().then(settings => {
            setAllowManual(settings.allowManualPayments)
            setActiveGateway(settings.activeOnlineGateway || 'CASHFREE')
        })
    }, [])

    const router = useRouter()
    const searchParams = useSearchParams()

    // Smart Fallback 1: Check if user returned with Failed status
    useState(() => {
        if (searchParams.get('status') === 'Failed') {
            setShowFallback(true)
        }
    })

    const handlePayment = async () => {
        setLoading(true)
        try {
            // Respect the gateway selected in Superadmin Settings
            console.log(`[PAYMENT] Initiating checkout with gateway: ${activeGateway}`);

            if (activeGateway === 'GRAYQUEST') {
                // 1. Create GrayQuest session
                const response = await fetch('/api/payment/grayquest/create-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount }),
                })

                const data = await response.json()
                if (!response.ok) {
                    throw new Error(data.error || data.details || "Failed to initialize GrayQuest session")
                }

                if (data.checkoutUrl) {
                    window.location.href = data.checkoutUrl
                    return
                } else {
                    throw new Error("No checkout URL received from GrayQuest")
                }
            }

            // --- Default: Cashfree Logic ---
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
            console.error("Payment initiation failed [DEBUG]:", error)
            if (error.stack) console.error("Error Stack:", error.stack)
            toast.error(error.message || "Something went wrong")
        } finally {
            setLoading(false)
            // Smart Fallback 2: SDK Error -> Show Manual Option
            setShowFallback(true)
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

            {/* Smart Fallback Link */}
            {showFallback && allowManual && (
                <div className="text-center pt-2 animate-in fade-in slide-in-from-top-2 duration-700">
                    <p className="text-xs text-slate-500 mb-1">Having trouble paying online?</p>
                    <button
                        onClick={() => setShowManual(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline decoration-blue-300 underline-offset-4"
                    >
                        Scan & Pay via QR Code
                    </button>
                </div>
            )}

            {/* Manual Payment Modal */}
            <ManualPaymentModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                amount={amount}
                userId={userId}
                onSuccess={() => {
                    // Refresh explicitly to show updated UI
                    window.location.reload()
                }}
            />

            {process.env.NODE_ENV === 'development' && userId && (
                <button
                    onClick={handleSimulation}
                    disabled={loading}
                    className="w-full text-xs text-slate-400 hover:text-amber-500 underline"
                >
                    [DEV ONLY] Simulate Successful Payment
                </button>
            )}

            <div className="pt-2">
                <p className="text-white/40 text-[10px] font-medium tracking-wide text-center uppercase">
                    Secured by {activeGateway === 'GRAYQUEST' ? 'GrayQuest payments' : 'Cashfree Payments'}
                </p>
            </div>
        </div>
    )
}
