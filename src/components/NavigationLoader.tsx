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

            if (anchor && anchor.href && !anchor.target && !e.ctrlKey && !e.metaKey) {
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
                    className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
                >
                    <motion.div
                        className="h-[3px] bg-gradient-to-r from-blue-600 via-amber-500 to-red-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        initial={{ width: "0%", x: 0 }}
                        animate={{
                            width: ["0%", "30%", "70%", "90%"],
                            transition: {
                                duration: 10,
                                times: [0, 0.1, 0.4, 1],
                                ease: "easeOut"
                            }
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    )
}
