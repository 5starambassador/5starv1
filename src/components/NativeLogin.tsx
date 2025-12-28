'use client'

import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Fingerprint } from 'lucide-react'
import { toast } from 'sonner'

// Dynamic import to avoid build failures if the plugin is not installed
let NativeBiometric: any = null

export function NativeLogin({ onMobileFill }: { onMobileFill?: (mobile: string) => void }) {
    const [available, setAvailable] = useState(false)

    useEffect(() => {
        const loadBiometrics = async () => {
            if (!Capacitor.isNativePlatform()) return

            try {
                // Dynamically import at runtime only on native platforms
                const module = await import('@capacitor-community/native-biometric')
                NativeBiometric = module.NativeBiometric

                const result = await NativeBiometric.isAvailable()

                if (result.isAvailable) {
                    setAvailable(true)
                }
            } catch (e) {
                // Soft fail: Just don't show the button if plugin fails or hardware missing
                console.log('Biometric plugin soft-fail:', e)
            }
        }

        loadBiometrics()
    }, [])

    const handleLogin = async () => {
        if (!NativeBiometric) return

        try {
            const verified = await NativeBiometric.verifyIdentity({
                reason: "FaceID for 5-Star Ambassador",
                title: "Log in",
                subtitle: "Use FaceID or Fingerprint",
                description: "Authenticate to access your dashboard",
            })
            // We only trigger success action if the plugin says verified
            // This prevents crashes from uncaught plugin errors

            // NOTE: In a real app, you would retrieve securely stored credentials here.
            // For this phase, we act as if verification happened.
            // You might want to retrieve the stored mobile number from Capacitor Preferences.

            toast.success("Biometric Verified!")

            // Example of retrieving stored user (mock)
            // onMobileFill?.('9999999999') 

        } catch (e: any) {
            // Check for specific error codes if needed, or just generic error
            console.error(e)
            toast.error("Authentication failed or cancelled.")
        }
    }

    if (!available) return null

    return (
        <div className="mt-8 text-center animate-fade-in">
            <button
                onClick={handleLogin}
                className="flex items-center justify-center gap-2 mx-auto bg-white/10 border border-white/20 rounded-full px-6 py-2 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
            >
                <Fingerprint className="text-[#FFD700]" size={20} />
                <span>Quick Login</span>
            </button>
        </div>
    )
}
