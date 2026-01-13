'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * PWA Install Prompt Component
 * 
 * Shows a beautiful install banner when:
 * - User is NOT yet using the installed app
 * - Browser supports PWA installation
 * - User hasn't dismissed it recently
 */
export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [showPrompt, setShowPrompt] = useState(false)

    useEffect(() => {
        // Check if already dismissed recently (24 hours)
        const dismissedAt = localStorage.getItem('pwa-prompt-dismissed')
        if (dismissedAt) {
            const hoursSinceDismiss = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60)
            if (hoursSinceDismiss < 24) return
        }

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return // Already installed
        }

        // Listen for the beforeinstallprompt event
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setShowPrompt(true)
        }

        window.addEventListener('beforeinstallprompt', handler)

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            console.log('PWA installed')
        }

        setDeferredPrompt(null)
        setShowPrompt(false)
    }

    const handleDismiss = () => {
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
        setShowPrompt(false)
    }

    if (!showPrompt) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50"
            >
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl shadow-blue-900/50 p-6 text-white relative overflow-hidden border border-white/10">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white blur-3xl" />
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                    >
                        <X size={16} />
                    </button>

                    {/* Content */}
                    <div className="relative z-10">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                <Smartphone size={28} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-black mb-1">Install Achariya App</h3>
                                <p className="text-sm text-blue-100 leading-relaxed">
                                    Get instant access with one tap. Works offline and launches like a native app!
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleInstall}
                                className="flex-1 bg-white text-blue-600 px-6 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-lg"
                            >
                                <Download size={18} />
                                Install Now
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-6 py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 transition-all border border-white/20"
                            >
                                Later
                            </button>
                        </div>

                        {/* Features */}
                        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-xs font-black text-blue-200">Fast</p>
                                <p className="text-[10px] text-blue-100/70">No browser lag</p>
                            </div>
                            <div>
                                <p className="text-xs font-black text-blue-200">Offline</p>
                                <p className="text-[10px] text-blue-100/70">Works anywhere</p>
                            </div>
                            <div>
                                <p className="text-xs font-black text-blue-200">Secure</p>
                                <p className="text-[10px] text-blue-100/70">Encrypted data</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
