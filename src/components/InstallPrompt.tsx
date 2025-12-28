'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [showPrompt, setShowPrompt] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        // 1. Don't show if already running as native app
        if (Capacitor.isNativePlatform()) return

        // 2. Check for iOS
        const userAgent = window.navigator.userAgent.toLowerCase()
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
        setIsIOS(isIosDevice)

        // 3. Listen for Android/Chrome install prompt
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
            // Check if user has already dismissed it recently (optional localStorage check)
            const hasDismissed = localStorage.getItem('installPromptDismissed')
            if (!hasDismissed) {
                setShowPrompt(true)
            }
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // 4. For iOS, we might show it immediately or after some interaction if not in standalone
        // @ts-ignore
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches
        if (isIosDevice && !isStandalone) {
            const hasDismissed = localStorage.getItem('installPromptDismissed')
            if (!hasDismissed) setShowPrompt(true)
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt && !isIOS) return

        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setShowPrompt(false)
            }
            setDeferredPrompt(null)
        }
    }

    const handleDismiss = () => {
        setShowPrompt(false)
        localStorage.setItem('installPromptDismissed', 'true')
    }

    if (!showPrompt) return null

    return (
        <div className="fixed bottom-20 left-4 right-4 bg-gray-900 text-white p-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom duration-500 xl:hidden">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                        <Download size={20} className="text-red-500" />
                        Install App
                    </h3>
                    <p className="text-sm text-gray-300">
                        {isIOS
                            ? "Tap the Share button below and select 'Add to Home Screen' for the best experience."
                            : "Install our app for easier access and a better experience."}
                    </p>
                </div>
                <button onClick={handleDismiss} className="p-1 hover:bg-white/10 rounded-full">
                    <X size={20} />
                </button>
            </div>
            {!isIOS && (
                <button
                    onClick={handleInstallClick}
                    className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    Install Now
                </button>
            )}
            {/* iOS Helper Arrow (Rough approximation) */}
            {isIOS && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 rotate-45 transform translate-y-1/2"></div>
            )}
        </div>
    )
}
