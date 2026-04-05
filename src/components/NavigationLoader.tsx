'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export function NavigationLoader() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isNavigating, setIsNavigating] = useState(false)

    // Reset loading state when pathname or searchParams change (navigation complete)
    useEffect(() => {
        setIsNavigating(false)
    }, [pathname, searchParams])

    // We can't easily intercept all Link clicks globally without a custom Link wrapper,
    // but we can listen for the 'beforeunload' or 'click' events on the document
    // to show the bar for 3rd party links or standard interactions.
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const anchor = target.closest('a')

            if (anchor && anchor.href && !anchor.download && !anchor.target && !e.ctrlKey && !e.metaKey) {
                const url = new URL(anchor.href)
                const currentUrl = new URL(window.location.href)

                // Only show if it matches our origin but is a different path/view
                if (url.origin === currentUrl.origin && (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search)) {
                    setIsNavigating(true)
                }
            }
        }

        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [])

    return (
        <AnimatePresence>
            {isNavigating && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] pointer-events-none"
                    transition={{ duration: 0.3 }}
                >
                    {/* Atmospheric Backdrop Blur - Premium Glass Feel */}
                    <div className="absolute inset-0 bg-white/[0.01] backdrop-blur-[1.5px]" />

                    {/* Radiant Progress Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-600 via-amber-500 to-red-600 relative"
                            initial={{ width: "0%", x: "-100%" }}
                            animate={{
                                width: ["0%", "35%", "75%", "92%"],
                                x: 0,
                                transition: {
                                    duration: 12,
                                    times: [0, 0.1, 0.4, 1],
                                    ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for "weighty" feel
                                }
                            }}
                        >
                            {/* Luminous Head - The "Spark" */}
                            <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/80 to-white shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-pulse" />
                            
                            {/* Secondary Glow Trace */}
                            <div className="absolute top-0 right-0 bottom-0 w-full bg-gradient-to-r from-transparent via-transparent to-white/10 blur-sm" />
                        </motion.div>
                    </div>

                    {/* Subtle Top Shadow for Depth */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/5 to-transparent" />
                </motion.div>
            )}
        </AnimatePresence>
    )
}
