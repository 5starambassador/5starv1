'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone, Zap, Lock, Wifi } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [showPrompt, setShowPrompt] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

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

    useEffect(() => {
        // 1. Don't show if already running as native app
        if (Capacitor.isNativePlatform()) return

        // 2. Check for iOS
        const userAgent = window.navigator.userAgent.toLowerCase()
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
        setIsIOS(isIosDevice)

        // 3. Check if already installed (standalone mode)
        // @ts-ignore
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches
        if (isStandalone) return

        // 4. Check if dismissed recently (show again after 3 days for better conversion)
        const dismissedAt = localStorage.getItem('installPromptDismissedAt')
        if (dismissedAt) {
            const daysSinceDismiss = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
            if (daysSinceDismiss < 3) return
        }

        // 5. Listen for Android/Chrome install prompt
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setShowPrompt(true)
        }

        const handleTriggerInstall = () => {
            if (deferredPrompt) {
                handleInstallClick()
            } else {
                // If no native prompt available (e.g. dismissed or not supported),
                // show our internal beautiful guide card instead of just doing nothing.
                setShowPrompt(true)
            }
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('trigger-PWA-install', handleTriggerInstall)

        // 6. For iOS, show instructions if not in standalone
        if (isIosDevice && !isStandalone) {
            // Delay showing iOS prompt by 3 seconds for better UX
            const timer = setTimeout(() => setShowPrompt(true), 3000)
            return () => {
                clearTimeout(timer)
                window.removeEventListener('trigger-PWA-install', handleTriggerInstall)
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('trigger-PWA-install', handleTriggerInstall)
        }
    }, [deferredPrompt, isIOS])

    const handleDismiss = () => {
        setShowPrompt(false)
        localStorage.setItem('installPromptDismissedAt', Date.now().toString())
    }

    if (!showPrompt) return null

    return (
        <div className="fixed top-20 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-[200] animate-in slide-in-from-top duration-500">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl shadow-blue-900/50 p-6 text-white relative overflow-hidden border border-white/10">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white blur-3xl" />
                </div>

                {/* Close Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        handleDismiss()
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all z-50 cursor-pointer"
                    aria-label="Close install prompt"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shrink-0">
                            <Smartphone size={28} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black mb-1">Install Achariya App</h3>
                            <p className="text-sm text-blue-100 leading-relaxed">
                                {isIOS
                                    ? "Tap the Share button (□↑) below and select 'Add to Home Screen' for instant access!"
                                    : deferredPrompt
                                        ? "Get instant access with one tap. Works offline and launches like a native app!"
                                        : "Tap the three dots (⋮) in your browser menu and select 'Install app' or 'Add to home screen'."}
                            </p>
                        </div>
                    </div>

                    {deferredPrompt && !isIOS && (
                        <button
                            onClick={handleInstallClick}
                            className="w-full bg-white text-blue-600 px-6 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-lg mb-4"
                        >
                            <Download size={18} />
                            Install Now
                        </button>
                    )}

                    {/* Features Grid */}
                    <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-white/20">
                        <div>
                            <Zap size={16} className="mx-auto mb-1 text-amber-300" />
                            <p className="text-xs font-black text-blue-200">Fast</p>
                            <p className="text-[10px] text-blue-100/70">Lightning speed</p>
                        </div>
                        <div>
                            <Wifi size={16} className="mx-auto mb-1 text-emerald-300" />
                            <p className="text-xs font-black text-blue-200">Offline</p>
                            <p className="text-[10px] text-blue-100/70">Works anywhere</p>
                        </div>
                        <div>
                            <Lock size={16} className="mx-auto mb-1 text-purple-300" />
                            <p className="text-xs font-black text-blue-200">Secure</p>
                            <p className="text-[10px] text-blue-100/70">Protected</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
